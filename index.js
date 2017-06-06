var fs = require('fs');

var app, client, logger;

var api = {
    _config: undefined,

    config: function(config) {
        this._config = config;
        logger = config.logger;
        app = config.app;
        client = config.elasticsearch;
    },

    static: function() {
        return __dirname + '/static';
    },

    init: function() {
    },

    pre: function() {

    },

    routes: function() {
        var config = this._config;
        var url_base = this._config.url_base;
        var path = __dirname;
        var search = config.search(config, '@timestamp');

        var index = function(req, res) {
            res.header("Cache-Control", "no-cache, no-store, must-revalidate");
            res.header("Pragma", "no-cache");
            res.header("X-Frame-Options", "Deny");

            // private version if logged in, otherwise public version
            if (req.user) {
                res.sendfile('index.html', {root: path + '/pstatic'});
            } else {
                res.sendfile('index.html', {root: path + '/static'});
            }
        };

        // return 404s for unauthenticated requests to /pstatic/* content
        app.get(url_base + '/pstatic/*', function(req, res) {
            if (req.user) {
                res.sendfile(req.url.replace(url_base + '/pstatic/', ""), {root: path + '/pstatic'});
            } else {
                res.status(404);
                res.send('Not found');
            }
        });

        app.get(url_base, function(req, res) {
            res.redirect(url_base + '/_'); // redirecting to a path handled by /* path below
        });

        app.get(url_base + '/', index);
        app.get(url_base + '/*', index);

        app.get(url_base + '/config', function(req, res) {
            // TODO: this isn't correct.
            fs.readFile('/wtconfig/webui.conf', {encoding: 'utf-8'}, function(err, data) {
                if (err) {
                    res.send(500, 'Could not load configuration: ' + err);
                    return;
                }

                res.json(JSON.parse(data));
            });
        });

        // TODO: this may not be a clean namespace
        app.use('/api/v1/logstash', function(req, res) {
            var queryConfig = {
                es_client: config.elasticsearch,
                sort_enabled: true,
                sort_default: false,
                sort_dates_only: false,
                date_range: '@timestamp'
            };
            search.luceneQuery(req, res, 'logstash-*', queryConfig);
        });
    },

    post: function() {

    }
};

module.exports = api;

