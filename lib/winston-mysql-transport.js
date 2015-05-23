/*
 * winston-mysql-transport - Transport for outputting to a Mysql database
 *
 * License : Public domain
 */

var util = require('util'),
    winston = require('winston'),
    mysql = require('mysql'),
    os = require('os');

//
// ### function Mysql (options)
// Constructor for the Mysql transport object.
//
var Mysql = exports.Mysql = function(options) {

    //mysql provide a lot of default options so we don't need to do useless override
    //https://github.com/felixge/node-mysql#connection-options
    this.options = options || {};

    //Only user/database/table are required
    if (!options.database)
        throw new Error('The database name is required');
    
    if (!options.table)
        throw new Error('The table name is required');

    if (!options.user)
        throw new Error('User is required');

    //Connection pool for a MysqlServer
    //this.pool = mysql.createPool(options);
}

//
// Inherit from `winston.Transport`.
//
util.inherits(Mysql, winston.Transport);

//
// Define a getter so that `winston.transports.Mysql`
// is available and thus backwards compatible.
//
winston.transports.Mysql = Mysql;

//
// Expose the name of this Transport on the prototype
//
Mysql.prototype.name = 'Mysql';

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
Mysql.prototype.log = function(level, msg, meta, callback) {
    var self = this;

    process.nextTick(function() {
    	self.open(function(err, connection) {
	    	if (err) {
	        	self.emit('error', err);
	        	return callback(err, null);
	      	}

	      	function onError(err) {
        		self.close(connection);
        		self.emit('error', err);
        		callback(err, null);
      		}

            //Log row
            log = {
                message : msg,
                timestamp : new Date(),
                level : level,
                hostname : os.hostname(),
                meta : (function(){
                    if(typeof meta === 'object' && Object.keys(meta).length > 0){
                        if(meta.type === 'string')
                            return meta.message

                        return JSON.stringify(meta)
                    }

                    else return null


                })()
            };

	      	//Save
	      	connection.query('INSERT INTO '+ self.options.table + ' SET ?', log, function(err, rows, fields) {
                self.close(connection);
                if(err)
	      			return onError(err);
                self.emit('logged');
	      		callback(null, true);
	      	})
    	})
    })
}

//
// ### function open (callback)
// #### @callback {function} Continuation to respond to when complete
// Attempts to open a new connection to the MySQL server.
//
Mysql.prototype.open = function(callback) {
	//this.pool.getConnection(callback);
    var connection = mysql.createConnection(this.options);
    callback(null, connection)
}

// ### function close ()
// Close a connection
//
Mysql.prototype.close = function (connection) {
    //connection.release();
    connection.end()
}