var app_config = require('./settings.json');
var log4js = require('log4js');
var http = require('http');
var mysql = require('mysql');
var moment = require('moment');

var app_logger = log4js.getLogger('wugmsNodeCron');

var cron1 = require('node-cron');
var cron5 = require('node-cron');
var cron15 = require('node-cron');

var options = {
    host: '',
    path: '/',
    port: '',
    method: 'GET'
};

callback = function (response) {
    var str = '';
    response.on('data', function (chunk) {
        str += chunk;
    });

    response.on('end', function () {
        /* Placeholder */
    });
    response.on('error', function (er) {
        app_logger.error('[HTTP] error: ' + er);
    });
    response.on('uncaughtException', function (err) {
        app_logger.error('[HTTP] uncaughtException: ' + err);
    });
};

log4js.configure(app_config.logger);

app_logger.info('Starting...');

/*       */
function getIndex(target_array, service) {
    var array_size = target_array.length;
    for (var j = 0; j < array_size; j++) {
        if (service === target_array[j]['name']) {
            return j;
        }
    }
    return false;
}

function getNodes(target_array, service) {
    var array_size = target_array.length;
    var target_nodes = [];
    for (var n = 0; n < array_size; n++) {
        var node_size = target_array[n]['services'].length;
        for (var a = 0; a < node_size; a++) {
            if (target_array[n]['services'][a] === service) {
                target_nodes.push(target_array[n]['ip_address']);
            }
        }
    }
    return target_nodes;
}

function runService(service_name) {
    var id = getIndex(app_config.services, service_name);
    if (id) {
        options.host = app_config.services[id].host;
        options.port = app_config.services[id].port;
        var tn = getNodes(app_config.nodes, service_name);
        var tn_size = tn.length;
        if (tn_size > 0) {
            app_logger.info('Found the following nodes to poll: ' + JSON.stringify(tn) + ' for service "' + service_name + '"');
            for (var d = 0; d < tn_size; d++) {
                options.path = app_config.services[id].path + tn[d];
                app_logger.info('Sending request -> ' + options.host + ' -> ' + options.port + ' Service -> "' + service_name + '" Target -> ' + tn[d]);
                http.request(options, callback).on('error', function (error) {
                    app_logger.error("[HTTP]  Server: " + error.address + " port: " + error.port + " reason: " + error.code);
                }).end();
            }
        } else {
            app_logger.info("No nodes have subscribed to the service: " + service_name);
        }
    } else {
        app_logger.info("No such service");
    }
}

cron1.schedule('* * * * *', function () {
    strd = moment().format("YYYY/MM/DD HH:mm:ss.SSS");
    app_logger.debug('Running cron (* * * * *)');
});

cron5.schedule('*/5 * * * *', function () {
    app_logger.debug('Running cron (*/5 * * * *)');
    runService('ap_clients');
    runService('arp');
});

cron15.schedule('*/15 * * * *', function () {
    app_logger.debug('Running cron (*/15 * * * *)');
    runService('bgp');
});