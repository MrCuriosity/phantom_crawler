/*
dependences [phantom 环境，纯node模块可以require，有外部模块依赖的node模块则不可以]
 */
var page = require('webpage').create(); //phantom webpage模块
var fs = require('fs'); //这里是phantom的fs模块，API与node不同
var today = new Date();
var filename = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '.log';
var __dirpath = '.'; //phantom.libraryPath即node的__dirname, 但有时候会报错，我也不知为什么
var logDirName = '/logs/'; //log文件夹名
var filePath = __dirpath + logDirName + filename;
fs.touch(filePath);

/*
script variables
 */
var interval = interval || {}; //检查器
var stepIndex = 0; //函数步骤计时器
var steps = steps || []; //函数步骤
var loadInProgress = false; //页面是否完全加载控制器(包括异步请求)
var canManipulate = true; //控制前端渲染(有别于异步请求，loadFinished但有可能前端还在渲染，如react，此时操作DOM就不准确)
/*
logger variables
 */
var applications = applications || []; //Apps，最终封装成一个json
var agents_total_amount = agents_total_amount || 0; //服务实例数量
/*
page settings
 */
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36';
page.settings.javascriptEnabled = true; //加载页面的时候执行javascript
page.settings.loadImages = false; //不加载图片，不然慢的要死
phantom.cookiesEnabled = true; //是否允许cookiejar，这点对有登录的任务来说很关键
/**
 * [logger 记录日志]
 * @param  {[type]} content [需要写入日志的内容]
 */
function logger(content) {
    fs.write(filePath, content, '+');
}
/**
 * [onLaodStarted 页面开始加载]
 */
page.onLoadStarted = function() {
    loadInProgress = true;
    console.log(('Loading Started'));
    logger('Loading Started');
}
/**
 * [onLoadFinished 页面加载完成]
 */
page.onLoadFinished = function() {
    loadInProgress = false;
    var url = page.evaluate(function() {
        return window.location.href;
    })
    console.log(('Loading Finished < ' + url + ' > \n\n'));
    logger('Loading Finished < ' + url + ' > \n\n');
}
/**
 * [onConsoleMessage 打印webpage的console信息(由于当前是node环境，无法打印web console)]
 * @param  {[type]} msg  [console信息]
 * @param  {[type]} line [行数]
 */
page.onConsoleMessage = function(msg, line) {
    console.log(msg);
    logger(msg + '\n');
}
page.onError = function(msg, trace) {
    var msgStack = ['ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function+'")' : ''));
        });
    }
    console.error(msgStack.join('\n'));
};
console.log('settings && dependences completed, start execution');
logger('settings && dependences completed, start execution\n');

steps = [
    /**
     * [Step 1 - 打开登录页]
     */
    function() {
        console.log('Step 1 - Open oneApm login page');
        logger('Step 1 - Open oneApm login page\n');
        page.open('http://user.oneapm.com/pages/v2/login', function(status) {
            console.log(status);
        });
    },
    /**
     * [Step 2 - 模拟用户操作登录]
     */
    function() {
        console.log('Step 2 - manipulate login form as a user');
        logger('Step 2 - manipulate login form as a user\n');
        page.evaluate(function() {
            document.querySelectorAll('[placeholder="邮箱/手机号"]')[0].value = 'username';
            document.querySelectorAll('[placeholder="密码"]')[0].value = 'password';
            document.querySelectorAll('[type="submit"]')[0].click();
        })
    },
    /**
     * [Step 3 - 在home页面点击applist链接]
     */
    function() {
        canManipulate = false;//异步加载很多JS，以及等DOM渲染完
        console.log('Step 3 - click applist link, go to applist page');
        logger('Step 3 - click applist link, go to applist page\n');
        setTimeout(function() {
            page.evaluate(function() {
                window.location.href = 'https://ai.oneapm.com/tpm/account/5593/applications';
            })
            canManipulate = true;
        }, 10000)
    },
    /**
     * [Step 4 - 在applist页面，做统计封装]
     */
    function() {
        canManipulate = false;//异步加载很多JS，以及等DOM渲染完
        console.log('Step 4 - now I\'m on the app page, start statisticing the apps and app_instances\' amount\nwait for 10 seconds...');
        logger('Step 4 - now I\'m on the app page, start statisticing the apps and app_instances\' amount\nwait for 10 seconds...\n');
        setTimeout(function() {
            /**
             * [通过页面数据封装applications]
             */
            apps = page.evaluate(function() {
                var app_links = app_links || [];
                var app_reg = /\/tpm\/account\/\d+\/applications\/\d+\/overview/;
                var links = Array.prototype.slice.call(document.querySelectorAll('a'));
                links.forEach(function(ele, index) {
                    if (app_reg.test(ele.href)) {
                        app_links.push({
                            'applicationName': ele.innerHTML,
                            'agents_amount': parseInt(ele.getAttribute('data-tip').match(/\d+/)[0])
                        })
                    }
                })
                return JSON.stringify(app_links);
            })
            applications = JSON.parse(apps);
            applications.forEach(function(app, index) {
                    agents_total_amount += parseInt(app.agents_amount);
                })
                /*
                这里不能直接logger(applications),似乎phantom本身的坑，只要在phantom环境下打印一个对象，得到的都是序列化
                的结果[object Object]
                 */
            console.log(JSON.stringify(applications, null, 1));
            logger(JSON.stringify(applications, null, 1) + '\n');
            console.log('agents_total_amount: ', agents_total_amount);
            logger('agents_total_amount: ' + agents_total_amount + '\n');
            canManipulate = true;
        }, 10000)
    }
];

/**
 * [execSteps 执行steps]
 */
interval = setInterval(execSteps, 50);

function execSteps() {
    if (canManipulate && !loadInProgress && Object.prototype.toString.call(steps[stepIndex]).slice(8, -1) === 'Function') {
        console.log(('Step ' + (stepIndex + 1)));
        steps[stepIndex]();
        stepIndex++;
    }

    if (canManipulate && Object.prototype.toString.call(steps[stepIndex]).slice(8, -1) !== 'Function') {
        console.log('Steps over!bye bye');
        logger('Steps over!bye bye!');
        phantom.exit();
    }
}
