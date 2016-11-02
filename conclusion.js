/*
dependences
 */
var fs = require('fs');
var path = require('path');
var log4js = require('log4js');
/*
variables
 */
var file_path = path.resolve(__dirname);// 上级目录
var logDir = '/logs/';//每天的日志目录
var destDir = '/conclusion_logs/';//该脚本文件的指定的目录
var reg_total_amount = new RegExp('agents_total_amount:\s*\d*', 'g');//匹配每个文件中数量的正则
var reg_applications = new RegExp(/\[[\s|\n]*\{[\s\S]*\}[\s|\n]*\]/g);//匹配log中applications
/*
logger config
 */

log4js.configure(__dirname + '/config.conclusion.json');
var loggerInfo = log4js.getLogger('conclusion');
loggerInfo.info(new Date() + '\n');
/**
 * [getFileNames]
 * @return {[type]} [当月log文件名组成的数组]
 */
function getFileNames() {
	var files = fs.readdirSync(file_path + '/logs/');
	var now = new Date();
	var year = now.getFullYear().toString();
	var month = now.getMonth() + 1;
	if (month < 10) {
		month = '0' + month;
	}
	var reg = new RegExp(year + '-' + month + '-');
	var resultFiles = resultFiles || [];

	files.forEach(function(val, index) {
		if (reg.test(val)) {
			resultFiles.push(val);
		}
	})
	loggerInfo.info('进行比对的文件: \n');
	console.log('进行比对的文件: \n');
	loggerInfo.info(resultFiles + '\n');
	console.log(resultFiles + '\n');
	return resultFiles;
}
/**
 * [getAmount]
 * @param  {[type]} files [当月文件名数组]
 */
function getAmount(files) {
	var resultArr = resultArr || [];
	var checkFile = function(filename, idx) {
		var path_each = file_path + logDir + filename;
		return new Promise(function(resolve, reject) {
			fs.readFile(path_each, 'utf8', function(err, data) {
				if (err) {
					console.log(err);
					throw new Error(err);
				} else {
					var result = data.match(reg_total_amount);
					if (result !== null) {
						var reg_num = /\d+/g;
						var num = result[0].match(reg_num);
						resultArr.push({
							file: filename,
							amount: parseInt(num)
						})
					}
				}
				resolve();
			})
		})
	}

	var readAll = files.map(checkFile);
	var result = Promise.all(readAll)
	.then(function() {
		// console.log(resultArr);

		resultArr.sort(function(a, b) {
			var result = b.amount - a.amount;
			if (result === 0) {
				return 1;
			} else {
				return a.amount - b.amount;
			}
		})
		var filepath = file_path + logDir +  resultArr[0].file;
		loggerInfo.info('选中的文件: ' + resultArr[0].file);
		console.log('选中的文件: ' + resultArr[0].file);		

		return new Promise(function(resolve, reject) {
			fs.readFile(filepath, 'utf8', function(err, data) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					// console.log(data);
					resolve(data);
				}
			})
		})
	})
	.then(function(data) {
		var wantedArr = data.match(reg_applications);

		console.log('————————————————————————  result  ——————————————————————————————');
		var wantedJson = JSON.parse(wantedArr[0].replace(/[\s|\n]/g, ''));
		var result = result || '';
		var amount = amount || 0;
		wantedJson.forEach(function(val, index) {
			result += val.applicationName + '   ' + val.agents_amount + '\n';
			amount += val.agents_amount;
		})
		loggerInfo.info(result);
		console.log(result);
		loggerInfo.info('total: ' + amount);
		console.log('total: ' + amount);
	})
	.catch(function(err) {
		console.log(err);
	})
}

var files = getFileNames();
getAmount(files);























