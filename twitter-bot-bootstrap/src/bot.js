// Dependencies =========================
var twit = require('twit')
var ura = require('unique-random-array')
var config = require('./config')
var strings = require('./helpers/strings')
var imgcounter = 1;
var path = require('path');

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
    Twitter.post('statuses/update', { status: newTweet }, function(err, data, response){
        // callback function not doing anything right meow
        if (response) {
            console.log('SadConeBristolBot has tweeted!');
        }
    });
}
// post a original tweet 4 hours after launch, then every 24 hours
postTweet();
setInterval(postTweet, delayHours(4));


// RETWEET BOT =========================
// find latest tweet according the query 'q' in params
// result_type: options, mixed, recent, popular
// * mixed : Include both popular and real time results in the response.
// * recent : return only the most recent results in the response
// * popular : return only the most popular results in the response.
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
        // if there no errors
        if (!err) {
            // grab ID of tweet to retweet
            try {
                // try get tweet id, derp if not
                var retweetId = data.statuses[0].id_str
            }
            catch (e) {
                console.log('retweetId DERP! ', e.message, ' Query String: ' + paramQS)
                return;
            }
            // Tell TWITTER to retweet
            Twitter.post('statuses/retweet/:id', {
                id: retweetId
            }, function(err, response) {
                if (response) {
                    console.log('SadConeBristolBot has re-tweeted!');
                }
                // if there was an error while tweeting
                if (err) {
                    console.log('RETWEET ERROR! Duplication maybe...: ', err, ' Query String: ' + paramQS)
                }
            });
        }
        // if unable to Search a tweet
        else {
            // console.log('Something went wrong while SEARCHING...')
        }
    });
}
// retweet a random tweet 0 hours after launch, then every 24 hours
setTimeout(function(){
    retweet();
    setInterval(retweet, delayHours(4));
}, delayHours(1));


// POST ORIGINAL IMAGE =========================
function postImage(){
    var imgSrc = path.join(__dirname,'original-images','0'+imgcounter+'.jpg'),
        imagesArray = strings.imagesTweets,
        imgTweet = imagesArray[imgcounter];

    Twitter.postMediaChunked({ file_path: imgSrc }, function (err, data, response) {
        var mediaIdStr = data.media_id_string
        var meta_params = { media_id: mediaIdStr, alt_text: { text: 'SadConeBristolBot' } }

     Twitter.post('media/metadata/create', meta_params, function (err, data, response) {
       if (!err) {
         // now we can reference the media and post a tweet (media will attach to the tweet)
         var params = { status: imgTweet, media_ids: [mediaIdStr] }

         Twitter.post('statuses/update', params, function (err, data, response) {
             if (response) {
                 console.log('SadConeBristolBot has posted an image!!');
                 if (imgcounter === (strings.imagesTweets.length-1)){imgcounter = 0;} else {imgcounter+=1};
             }
         });
       }
     })
  });
}
setTimeout(function(){
    postImage();
    setInterval(postImage, delayHours(4));
}, delayHours(2));


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
            // Tell TWITTER to 'favorite'
            Twitter.post('favorites/create', {
                id: randomTweet.id_str
            }, function(err, response) {
                // if there was an error while 'favorite'
                if (response) {
                    console.log('SadConeBristolBot has favorited a tweet!');
                }
            })
        }
    })
}
// favorite a random tweet 4 hours after launch, then every 24 hours
setTimeout(function(){
    favoriteTweet();
    setInterval(favoriteTweet, delayHours(4));
}, delayHours(3));



// REPLY-FOLLOW BOT ============================
// STREAM API for interacting with a USER
// set up a user stream

var stream = Twitter.stream('user')
// reply 15 minutes after someone follows you
stream.on('follow', followed);
// ...trigger the callback
function followed(event) {
    // console.log('Follow Event now RUNNING')
    // get USER's twitter handle (screen name)
    var screenName = event.source.screen_name

    // CREATE RANDOM RESPONSE  ============================
    var responseString = rs()
    var find = 'screenName'
    var regex = new RegExp(find, "g")
    responseString = responseString.replace(regex, screenName)

    // function that replies back to every USER who followed for the first time
    // console.log(responseString)
    tweetNow(responseString)
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
    }
    else {
        Twitter.post('statuses/update', tweet, function(err, data, response) {
            if (err) {
                console.log('Cannot Reply to Follower. ERROR!: ' + err)
            }
            else {
                console.log(tweetTxt);
            }
        })
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
