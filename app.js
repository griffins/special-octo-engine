const axios = require('axios');
const chalk = require('chalk');
const log = console.log;
const moment = require('moment');

function info(message) {
    log(chalk.green(message));
}

function debug(message) {
    log(chalk.blue(message));
}

function error(message) {
    log(chalk.red(message));
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] !== 'undefined' ? args[number] : match;
        });
    };
}

var app = {limit: 0, remaining: 0, data: {first_poll: false, time: undefined, samples: 6, time_frame: 0}};

app.poll = function (url, callback) {
    if (this.ready(url)) {
        debug("Queuing request");
        this.remaining--;
        return axios(url)
            .then(response => {
                callback(response);
            })
            .catch(err => {
                error(err);
            });
    } else {
        debug("dropped request");
        return new Promise(function (resolve, reject) {
            resolve();
        }).catch();
    }
};
app.probeWindow = function (url, callback) {
    axios(url)
        .then(response => {
            var remaining = parseInt(response.headers['x-ratelimit-remaining']);
            date = moment(response.headers['date']);
            var rqs = [];
            for (x = 0; x < remaining; x++) {
                rqs.push(axios.get(url));
            }
            axios.all(rqs).then(axios.spread(() => {
                this.data.time = moment();
                this.attemptPolling(url, callback)
            }));
        })
        .catch(err => {
            error(err);
        });

};
app.attemptPolling = function (url, callback) {
    axios(url).then(response => {
        this.limit = parseInt(response.headers['x-ratelimit-limit']);
        callback(moment().diff(this.data.time));
    }).catch(err => {
        if (err.request !== undefined && err.request.res.statusCode === 429) {
            setTimeout(() => {
                this.attemptPolling(url, callback);
            }, 200);
        } else {
            error(err);
        }
    });
};
app.resetBucket = function () {
    this.remaining = this.limit - 1;
    this.data.time = moment();
    debug("Remaining: {0}, limit {1}".format(this.remaining, this.limit));
};
app.ready = function (url) {
    if (this.data.first_poll) {
        if (this.data.time_frame > 0 && moment().diff(this.data.time) > this.data.time_frame) {
            this.resetBucket();
        }
        return this.remaining > 0;
    } else {
        this.data.first_poll = true;
        var dataset = [];
        var feeder = (time) => {
            if (dataset.length < this.data.samples) {
                debug("Time elapsed {0}ms".format(time));
                dataset.push(time);
                this.probeWindow(url, feeder);
            } else {
                this.data.time_frame = dataset.reduce(function (a, b) {
                    return a + b;
                }) / dataset.length;
                debug("time frame avg: {0}".format(this.data.time_frame));
                this.resetBucket(this.data.time_frame);
            }
        };
        this.probeWindow(url, feeder.bind(this));
        return false;
    }
}
;
const poll = function () {
    const promise = app.poll('http://51.144.38.252:8080/api/hello', function (response) {
        debug("Response: {0}".format(chalk.green(response.data)));
    });
    promise.then(function () {
        setTimeout(poll, 500)
    })
};

poll();