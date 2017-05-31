/**
 * Created by hama on 2016/11/16.
 */
//连接数据库

//1.引入数据库的配置文件
const settings = require('../setting');
const Db = require('mongodb').Db;
const Connection = require('mongodb').Connection;
const Server = require('mongodb').Server;
module.exports = new Db(settings.db,
    new Server(settings.host,settings.port),
    {safe:true}
)


