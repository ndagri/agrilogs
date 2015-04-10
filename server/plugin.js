var fs = require('fs');

var app, client, logger;

var api = {
    _config: undefined,

    config: function(config) {
        this._config = config;
        logger = config.logger;
        client = config.elasticsearch;
    },

    init: function() {
    },

    pre: function() {

    },

    routes: function() {
        var url_base = this._config.url_base;
        var path = this._config.path;

        var index = function(req, res) {
            res.header("Cache-Control", "no-cache, no-store, must-revalidate");
            res.header("Pragma", "no-cache");
            res.header("X-Frame-Options", "Deny");
            
            res.sendfile('index.html', {root: path + '/static'});
        }

        this._config.app.get(url_base, function(req, res) {
            res.redirect(url_base + '/_'); // redirecting to a path handled by /* path below
        });

        this._config.app.get(url_base + '/', index);
        this._config.app.get(url_base + '/*', index);
                
        this._config.app.get(url_base + '/config', function(req, res) {
            // TODO: this isn't correct.
            fs.readFile('/wtconfig/webui.conf', { encoding: 'utf-8' }, function (err, data) {
                if (err) {
                    res.send(500, 'Could not load configuration: ' + err);
                    return;
                }
                
                res.json(JSON.parse(data)); 
            });    
        });

        // TODO: this may not be a clean namespace
        this._config.app.use('/api/v1/logstash', function(req, res) {
            detailQuery(req, res, 'logstash-*', {
                sort_enabled: true, 
                sort_default: false, 
                sort_dates_only: false,
                date_range: '@timestamp'
            });
        });
    },

    post: function() {

    }
}

module.exports = api;

    


    function performSearch(context, req, res, config) {
        if (req.query.size > 100000) {
            res.json(500, { error: "Request size too large. Must be less than 100000." });
            return;
        }

        // Setup the default query context
        if (! config.hasOwnProperty('body') || ! config.body) {
            context.body = {
                'query': {
                    'filtered': {
                        'filter': {
                            'bool': {
                                'must': [ 
                                                 
                                ]
                            }
                        }
                    } 
                }
            }            
        }

        if (config.query) {
            context.body.query.filtered.filter.bool.must.push(config.query);
        }

        if (config.filtered_query) {
            context.body.query.filtered.query = config.filtered_query;
        }

        if (config.date_range) {
            if (! validateDateRange(res, req.query.date_start, req.query.date_end)) {
                return;
            }
            
            var dateContext = prepareDateRange(config.date_range, req.query.date_start, req.query.date_end)
            if (dateContext) {
                context.body.query.filtered.filter.bool.must.push(dateContext);
            }
        }

        context.size = 100;        
        if (req.query.size) {
            context.size = req.query.size;
        }

        if (req.query.start) {
            context.from = req.query.start;
        }  

        // Parameter to retrieve a particular type of record
        // TODO: validate incoming type
        if (req.query.type) {     
            context.body.query.filtered.filter.bool.must.push({
                'term': {
                    'type': req.query.type
                }
            });
        }

        // See if we should include a default sort
        if (config.sort_default) {
            context.sort = 'date:desc'             
        }

        if (config.sort_enabled && req.query.sort) {            
            // split the value and verify
            var pieces = req.query.sort.split(':')
            if (config.sort_dates_only && pieces[0].toLowerCase() !== 'date') {
                res.json(500, { error: "Invalid sort parameter. Sorting currently available for the 'date' field only." });
                return;
            }

            if (pieces.length != 2 || (pieces[1].toLowerCase() != 'asc' && pieces[1].toLowerCase() != 'desc')) {
                res.json(500, { error: "Invalid sort parameter. Must be field_name:asc or field_name:desc." });
                return;
            }

            context.sort = req.query.sort;
        }    

        client.search(context, function (error, response) {
            if (error || (response && response.error)) {
                if (error) {
                    logger.error("Search error " + error);    
                }
                else {
                    logger.error("Search response error " + response.error);
                }

                res.json(500, { error: 'Error during query execution.' });
                return;
            }

            if (response.hits) {
                var results = [];
                for (var i = 0; i < response.hits.hits.length; i++) {
                    results.push(response.hits.hits[i]._source);
                }

                var message = response.hits.total + " results found.";
                if (response.hits.total > context.size) {
                    message += " Returning " + context.size + "."                    
                }

                if (! config.sort_enabled && req.query.sort) { 
                    message += " No sorting available."
                }

                res.json({
                    info: message,
                    results: results
                });    
            } 
            else {
                res.json(500, { error: 'No results returned from query.' });
            }           
        });         
    }

    function detailQuery(req, res, index, config) {
        if (! req.query.q) {
            res.json(500, { error: "Search query must be specified in the query parameter q."})
            return;
        }

        // Verify the query string doesn't contain any forms that we need to block
        var re = RegExp('[^\\s]*.*:[\\s]*[\\*\\?](.*)')
        if (re.test(req.query.q)) {
            res.json(500, { error: "Wild card queries of the form 'fieldname:*value' or 'fieldname:?value' can not be evaluated. Please refer to the documentation on 'fieldname.right'."})
            return;
        }
        
        config.filtered_query = {
            "query_string" : {
                "default_field" : "",
                "query" : req.query.q
            }
        };

        performSearch({
            index: index,   
            ignoreUnavailable: true         
        }, req, res, config);
    }

    function restrictRole(req, res, role) {
        // If the user has the restricted role we deny access.
        if (req.user.role === role) {
            res.json(403, { error: 'Access Denied - You don\'t have permission to this data' });
            return true;
        }

        // Role is ok
        return false;
    }

    /*
     * Generates a list of indexes to search based off the API history parameters.
     */
    function indexHistory(days, start) {        
        var result = "";

        for (var i = start; i < (start + days); i++) {
            var date = new Date();
            date.setDate(date.getDate() - i)
            
            if (result) {
                result += ',detail-' + indexing.formatIndexDate(date);    
            }
            else {
                result = 'detail-' + indexing.formatIndexDate(date);        
            }
            
        }

        return result;
    }

   
    function validateDateRange(res, date_start, date_end) {
        var message = "";

        if (date_start) {
            date_start = Date.parse(date_start);
            if (Number.isNaN(date_start)) {
                message = "date_start is not a valid ISO 8601 date";
            }
        }

        if (date_end) {
            date_end = Date.parse(date_end);
            if (Number.isNaN(date_end)) {
                message = "date_end is not a valid ISO 8601 date";   
            }
        }

        if (date_start && date_end) {
            if (date_start > date_end) {
                message = "date_end is before date_start";
            }
        }
        else if (! message) {                
            if (date_end && ! date_start) {
                message = "date_end provided without a corresponding date_start";
            }
        }

        if (message) {
            res.json(500, { error: message });
            return false;
        }
        else {
            return true;
        }
    }

    function prepareDateRange(date_field, date_start, date_end) {
        var query = { 
            "range" : {                
            }
        };        

        query.range[date_field] = {};

        if (date_start && date_end) {
            query.range[date_field].gte = date_start;
            query.range[date_field].lte = date_end

            return query;
        }
        else if (date_start) {
            query.range[date_field].gte = date_start;
        
            return query;
        }

        return null;
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
