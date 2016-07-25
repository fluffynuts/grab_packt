'use strict';
const
  request = require('request').defaults({
    jar: true
  }),
  path = require('path'),
  cheerio = require('cheerio'),
  opts = require('./options'),
  mkdirp = require('mkdirp'),
  fs = require('fs'),
  logModule = require('./log'),
  log = logModule.writeLine,
  colors = logModule.colors,
  _ = require('./lodash-min');

const PACKT_SITE = 'https://www.packtpub.com'
function getFullBookClaimUrlFor(relativeUrl) {
  return [
    PACKT_SITE,
    relativeUrl
  ].join('/')
}

function status(message) {
  process.stdout.write(_.padStart(message, 32))
}
function ok() {
  process.stdout.write(' [  OK  ]\n')
}
function fail() {
  process.stdout.write(' [ FAIL ]\n')
}

function simplify(options) {
  const map = {
    email: 'PACKT_EMAIL',
    password: 'PACKT_PASSWORD',
    downloadFolder: 'DOWNLOAD_FOLDER',
    pushbulletKey: 'PUSHBULLET_API_KEY',
    pushbulletTarget: 'PUSHBULLET_TARGET',
    debug: 'DEBUG',
    eventLog: 'EVENT_LOG'
  };
  const booleans = ['debug', 'eventLog']
  return _.keys(map).reduce((acc, cur) => {
    acc[cur] = options[opts.keys[map[cur]]];
    if (booleans.indexOf(cur) > -1) {
      acc[cur] = !!acc[cur];
    }
    return acc;
  }, {})
}

function validate(options) {
  if (!options.email || !options.password) {
    throw new Error('Email and password are required!');
  }
}

module.exports = function (options) {
  options = simplify(options);
  if (options.eventLog) {
    logModule.enableEventLog('Packt Grabber');
  }
  validate(options);
  var loginDetails = {
    email: options.email,
    password: options.password,
    op: "Login",
    form_id: "packt_user_login_form",
    form_build_id: ""
  };
  var url = 'https://www.packtpub.com/packt/offers/free-learning';
  var loginError = 'Sorry, you entered an invalid email address and password combination.';
  var getBookUrl;
  var bookTitle;

  if (options.debug) {
    console.log(options);
    process.exit(1);
  }

  log(colors.yellow, '--- Looking up Packt free book of the day ---')
  request(url, function (err, res, body) {
    if (err) {
      console.error('Request failed');
      return;
    }

    var $ = cheerio.load(body);
    getBookUrl = $("a.twelve-days-claim").attr("href");
    bookTitle = $(".dotd-title").text().trim();
    var bookDetails = createBookDetails(bookTitle, getBookUrl)
    var newFormId = $("input[type='hidden'][id^=form][value^=form]").val();

    if (newFormId) {
      loginDetails.form_build_id = newFormId;
    }

    request.post({
      uri: url,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: require('querystring').stringify(loginDetails)
    }, function (err, res, body) {
      if (err) {
        console.error('Login failed');
        console.log('----------- Packt Grab Done --------------');
        return;
      };
      var $ = cheerio.load(body);
      var loginFailed = $("div.error:contains('" + loginError + "')");
      if (loginFailed.length) {
        console.error('Login failed, please check your email address and password');
        console.log('Login failed, please check your email address and password');
        console.log('----------- Packt Grab Done --------------');
        return;
      }
      const claimUrl = getFullBookClaimUrlFor(getBookUrl)
      request(claimUrl, function (err, res, body) {
        if (err) {
          console.error('Request Error');
          console.log('----------- Packt Grab Done --------------');
          return;
        }

        var $ = cheerio.load(body);

        console.log([
          'Today\'s free book is:',
          '  ' + bookTitle,
          '  (claim url: ' + claimUrl + ')'
        ].join('\n'))
        downloadBookFiles(bookDetails)
      });
    });
  });

  var pushBulletDetails = {
    apiKey: options.pushbulletKey,
    target: options.pushbulletTarget
  };

  function createBookDetails(bookTitle, getBookUrl) {
    var baseUrl = 'https://www.packtpub.com';
    // getBookUrl sample = '/freelearning-claim/18940/21478'
    // Sample Download Urls
    //'https://www.packtpub.com/ebook_download/18940/pdf'
    //'https://www.packtpub.com/ebook_download/18940/epub'
    //'https://www.packtpub.com/ebook_download/18940/mobi'
    //'https://www.packtpub.com/code_download/19957' // Can't build this url
    var bookId = getBookUrl.replace('/freelearning-claim/', '')
      .replace('/21478', '');


    return {
      title: bookTitle,
      claimUrl: baseUrl + getBookUrl,
      bookId: bookId,
      pdfUrl: baseUrl + '/ebook_download/' + bookId + '/pdf',
      epubUrl: baseUrl + '/ebook_download/' + bookId + '/epub',
      mobiUrl: baseUrl + '/ebook_download/' + bookId + '/mobi'
    };
  }

  function downloadBookFiles(bookDetails) {
    log(colors.green, 'Downloading to: ' + options.downloadFolder);
    downloadBook(bookDetails.pdfUrl, 'pdf', function (path) {
      downloadBook(bookDetails.epubUrl, 'epub', function (path) {
        downloadBook(bookDetails.mobiUrl, 'mobi', function (path) {
          console.log('All variants of ' + bookDetails.title + ' have been downloaded!');
          sendNotification(bookDetails.title);
        });
      });
    });

    function downloadBook(downloadUrl, extension, callback) {
      const
        title = bookDetails.title.replace(/:/g, '_'),
        outputPath = path.join(options.downloadFolder, title, title + '.' + extension)
      downloadFile(downloadUrl, outputPath, callback);
    }

    function downloadFile(downloadUrl, outputPath, callback) {
      const parts = outputPath.split('/')
      console.log('Downloading: ' + parts[parts.length-1])
      //callback(); return;//Skip download      
      var destination = createWriteFileStream(outputPath);
      //Lets save the modulus logo now
      request(downloadUrl)
        .pipe(destination)
        .on('error', function (error) {
          console.log('Error downloading "' + downloadUrl + '":' + error);
        }).on('finish', function () {
          console.log('Successful Download to: ' + outputPath);
          callback(outputPath);
        });

      function createWriteFileStream(filePath) {
        mkdirp.sync(path.dirname(filePath));
        //Lets define a write stream for our destination file
        return fs.createWriteStream(filePath);
      }
    }
  }

  function sendNotification(noteBody) {
    if (!pushBulletDetails.apiKey) {
      console.log('PushBullet not configured; skipping notification.')
      return;
    }
    var PushBullet = require('pushbullet');
    var pusher = new PushBullet(pushBulletDetails.apiKey);

    pusher.note(pushBulletDetails.target, 'New eBook Claimed', noteBody, function (error, response) {
      if (error) {
        console.log('Error Notifying "' + pushBulletDetails.target + '": ' + error);
        return;
      }
      // response is the JSON response from the API 
      console.log(pushBulletDetails.target + ' notified via PushBullet');
    });
  }
}; 
