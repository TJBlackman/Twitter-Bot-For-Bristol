// Dependencies =========================
var twit = require('twit')
var ura = require('unique-random-array')
var config = require('./config')
var strings = require('./helpers/strings')
var imgcounter = 1;
var path = require('path');
var cron = require('cron').CronJob;

var Twitter = new twit(config)


// RANDOM QUERY STRING  =========================
var qs = ura(strings.queryString);
var qsSq = ura(strings.queryStringSubQuery);
var rt = ura(strings.resultType);
var rs = ura(strings.responseString);
var ot = ura(strings.originalTweets);

// POST ORIGINAL TWEET =========================
function postTweet(){
    var newTweet = ot(); // get new tweet
    // post it
    Twitter.post('statuses/update', { status: newTweet }, function(err, data, response){ });
}

// RETWEET BOT =========================
var retweet = function() {
    var paramQS = qs()
    paramQS += qsSq()
    var paramRT = rt()
    var params = {
        q: paramQS + paramBls(),
        result_type: paramRT,
        lang: 'en'
    };
    Twitter.get('search/tweets', params, function(err, data) {
        if (!err) {
            // grab ID of tweet to retweet
            try {
                var retweetId = data.statuses[0].id_str
				// Tell TWITTER to retweet
				Twitter.post('statuses/retweet/:id', { id: retweetId }, function(err, response) {
					if (err) { return false; }
				});
            }
            catch (e) { return; }
        }
    });
}

// POST ORIGINAL IMAGE =========================
function postImage(){
    var imgSrc = path.join(__dirname,'original-images','0'+imgcounter+'.jpg');

	if (imgcounter < 11) {
		Twitter.postMediaChunked({ file_path: imgSrc }, function (err, data, response) {
			var mediaIdStr = data.media_id_string
			var meta_params = { media_id: mediaIdStr, alt_text: { text: 'SadConeBristolBot' } }

			Twitter.post('media/metadata/create', meta_params, function (err, data, response) {
				if (!err) {
					// now we can reference the media and post a tweet (media will attach to the tweet)
					var params = { status: '', media_ids: [mediaIdStr] }

					Twitter.post('statuses/update', params, function (err, data, response) {
						if (response) { imgcounter+=1; }
					});
				}
			})
		});
	}
}

// FAVORITE BOT =========================
// find a random tweet and 'favorite' it
var favoriteTweet = function() {
    var paramQS = qs()
    paramQS += qsSq()
    var paramRT = rt()

    var params = {
        q: paramQS + paramBls(),
        result_type: paramRT,
        lang: 'en'
    }

    // find the tweet
    Twitter.get('search/tweets', params, function(err, data) {

        // find tweets
        var tweet = data.statuses;
        var randomTweet = ranDom(tweet); // pick a random tweet

        // if random tweet exists
        if (typeof randomTweet != 'undefined') {
            Twitter.post('favorites/create', { id: randomTweet.id_str }, function(err, response){});
        }
    })
}

// REPLY-FOLLOW BOT ============================
var stream = Twitter.stream('user')
// reply after someone follows you
stream.on('follow', followed);

function followed(event) {
    var screenName = event.source.screen_name
    var responseString = rs();

    responseString = responseString.replace('[[screenName]]', screenName)
    tweetNow(responseString);
}
// function definition to tweet back to USER who followed
function tweetNow(tweetTxt) {
    var tweet = {
        status: tweetTxt
    };
    // HARCODE user name in and check before RT
    var n = tweetTxt.search(/@SadConeBearBot/i)
    if (n != -1) {
        // console.log('TWEET SELF! Skipped!!')
    } else {
        Twitter.post('statuses/update', tweet, function(err, data, response) {});
    }
}

// HELPER FUNCTIONS ============================
// function to generate a random tweet tweet
function ranDom(arr) {
    var index = Math.floor(Math.random() * arr.length)
    return arr[index]
}
function paramBls() {
    var ret = '',
        arr = strings.blockedStrings,
        i, n
    for (i = 0, n = arr.length; i < n; i++) {
        ret += ' -' + arr[i];
    }
    return ret;
}
function delayHours(num){
    var hours = num * 3600000;
    return hours;
}


console.log('SadConeBristolBot is running!');

// == actions available
    // postTweet();
    // retweet();
    // postImage();
    // favoriteTweet();
var actionNum = 0;

// cycles through actions, once per day, reset counter when reaching last (4th) action
new cron('45 11 * * *', function(){
    if (actionNum === 4) {actionNum = 0}
    [postTweet, retweet, postImage, favoriteTweet][actionNum]();
    actionNum+=1;
}, function(){
    /*do this when jobs ends*/
}, true, 'America/Denver');
