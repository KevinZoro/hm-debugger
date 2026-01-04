const VERSION = "0.0.7";
let utils = {
    isEmptyObject: t => 0 === Object.keys(t).length,
    warning: t => `<span class="error">${t}</span>`,
    prependMessage: t => `\n        <div class="version-tip-wrapper">\n            <div class="version-tip">\n                <div class="text">${t}</div>\n            </div>\n        </div>\n    `
};
const UNLOGIN = 2,
    ERROR = 1,
    SUCCECSS = 0;

$(document).ready(function() {
    const t = new Semanticization;
    let e = "pc",
        i = !1;
    // Removed direct background page access
    // let s = chrome.extension.getBackgroundPage(); 

    // Helper for messaging
    const sendMessage = (type, data = {}) => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type,
                ...data
            }, resolve);
        });
    };

    let n = {
        tabId: null,
        lastsSiList: {},
        isEmpty: !1,
        reset() {
            $(".detail", "#tabs-1").empty(), this.sListInfo = [], this.isEmpty = !0, this.lastsSiList = {}
        },
        hideLoading() {
            $(".message", "#tabs-1").fadeIn(), $(".loading", "#tabs-1").hide()
        },
        showLoading() {
            $(".message", "#tabs-1").hide(), $(".loading", "#tabs-1").show()
        },
        show(t, e, i) {
            if (this.showLoginTip(), this.isEmpty = !1, i) {
                let t;
                return t = "j" === i.type ? {
                    [i.si]: {
                        j: [i],
                        g: []
                    }
                } : {
                    [i.si]: {
                        g: [i],
                        j: []
                    }
                }, void this.convertSiList(t)
            }
            this.showLoading();
            let s = t[0].id;
            this.tabId = s;
            let n = e[s];
            if (n && !utils.isEmptyObject(n.data)) {
                if (n.result) return void this.showSuccess(n.result);
                let t = n.data;
                this.convertSiList(t)
            } else this.showFailure()
        },
        showSuccess(t) {
            this.sListInfo = t, t.forEach(t => {
                this.appendReqItem(t)
            }), this.hideLoading()
        },
        showFailure() {
            let t = "";
            t = navigator.onLine ? utils.warning("未检测到统计代码，如果该页面加载于插件安装之前，请尝试刷新页面后再重新执行检查") : utils.warning("网络已断开，请稍后重试"), $(".detail", "#tabs-1").html(t), this.hideLoginTip(), this.hideLoading()
        },
        showLogin(t) {
            $(".detail", "#tabs-1").html('未登录百度统计，请<a href="https://tongji.baidu.com/web/welcome/login?loginDialog=1" class="login-link" target="_blank">登录</a>'), this.hideLoginTip(), this.hideLoading()
        },
        showLoginTip() {
            $(".login-tip").show()
        },
        hideLoginTip() {
            $(".login-tip").hide()
        },
        appendReqItem(t) {
            let e, i, n = t.isDuplicate ? "重复" : "";
            t.isCorrect ? e = `<div class="d-item">您${n}安装了账户"${t.account}"的站点"${t.domain}"的统计代码；` : t.account ? e = `<div class="d-item">该页面${n}安装了不属于您账号的统计代码<br/>` + `(站点id:${t.si};所属站点:${t.domain};所属账号:${t.account})` : (i = t.referer ? '<li class="error">•&nbsp;当前配置文件可能还未生效</li>' : '<li class="error">•&nbsp;该页面禁用了referer</li>', e = `<div class="d-item">\n                            <div>您错误安装了站点id为 <b>${t.si}</b> 的统计代码，错误原因如下：</div>\n                            <ul>${i}</ul>\n                        </div>`), $(".detail", "#tabs-1").append(e);
            
            // s.cacheResult(this.tabId, $.extend(!0, [], this.sListInfo));
            sendMessage("CACHE_RESULT", {
                tabId: this.tabId,
                result: $.extend(!0, [], this.sListInfo)
            });
            
            this.hideLoading()
        },
        getAccountInfoBySi(t) {
            return new Promise((e, i) => {
                this.lastsSiList[t] = this.lastsSiList[t] ? this.lastsSiList[t] : {
                    value: null
                }, this.lastsSiList[t].value ? e(this.lastsSiList[t].value) : 
                // s.getCheckResultBySiList({siList: [t]}, (s, n) => { ... })
                sendMessage("CHECK_RESULT", {data: {siList: [t]}}).then(response => {
                     // response is {data, status}
                     let s = response.data;
                     let n = response.status;
                     
                     if (0 === n) {
                        let i, n = s.data.correct,
                            a = s.data.incorrect;
                        return n.some(e => e.si === t && ((i = e).isCorrect = !0, !0)), i || a.some(e => e.si === t && ((i = e).isCorrect = !1, !0)), this.lastsSiList[t].value = i, void e(i)
                    }
                    i(n)
                });
            })
        },
        sListInfo: [],
        isDuplicate(t) {
            return this.lastsSiList[t]
        },
        formatRequestItem(t) {
            return new Promise((e, i) => {
                let s = $.extend(!0, {}, t),
                    n = s.si,
                    a = this.isDuplicate(n);
                if ("j" === s.type) s.isDuplicate = a, !s.contentLength > 0 ? (s.isCorrect = !1, e(s)) : this.getAccountInfoBySi(n).then(t => {
                    Object.assign(s, t), e(s)
                }).catch(t => {
                    i(t)
                });
                else {
                    if (a) return void e(null);
                    this.getAccountInfoBySi(n).then(t => {
                        Object.assign(s, t), e(s)
                    }).catch(t => {
                        i(t)
                    })
                }
            })
        },
        convertSiList(t) {
            for (let e in t) {
                let i = t[e];
                if (i.j.length) i.j.forEach(t => {
                    this.formatRequestItem(t).then(t => {
                        t && (this.sListInfo.push(t), this.appendReqItem(t))
                    }).catch(t => {
                        2 === t && this.showLogin()
                    })
                });
                else if (i.g.length) {
                    if (!i.g.filter(function(t) {
                            return !HolmesServices.isUnsentLog(t)
                        }).length) continue;
                    this.formatRequestItem(i.g[0]).then(t => {
                        t && (this.sListInfo.push(t), this.appendReqItem(t))
                    }).catch(t => {
                        2 === t && this.showLogin()
                    })
                }
            }
        }
    },
    a = {
        count: 0,
        isRendered: !1,
        timer2: null,
        reset() {
            this.isEmpty = !0, $("#accordion").empty(), this.count = 0, this.isRendered = !1
        },
        hideLoading() {
            $("#accordion").fadeIn(), $("#tabs-2 .loading").hide()
        },
        showLoading() {
            $("#accordion").hide(), $(".loading", "#tabs-2 ").show()
        },
        appendReqItem(e) {
            this.count++;
            let i = $("#accordion");
            const s = t.getEventType(e);
            if (s) {
                const n = t.getEventDescription(e);
                let a = `\n                <h3 class="ellipsis">${s}</h3>\n                <div id="accordion-${this.count}"></div>\n                `;
                i.append(a);
                let o = [];
                for (let t = 0; t < n.length; t++) o.push("<p>" + n[t] + "</p>");
                o.push("<p>统计JS代码为：" + e.si + "</p>"), $("#accordion-" + this.count).html(o.join("")), $("#accordion").accordion("refresh"), $(".ui-accordion-header", "#accordion").off("click").click(function() {
                    $(this).toggleClass("ui-state-active"), $(this).next().toggle()
                })
            }
        },
        isEmpty: !1,
        show(e, i, s) {
            if (this.isEmpty = !1, this.isRendered && !s) return;
            let n = $("#accordion");
            if (s) return this.initAccordion || (n.empty(), n.accordion({
                collapsible: !0,
                animate: !1,
                icons: !1,
                heightStyle: "content",
                active: !1
            }), this.initAccordion = !0), void(t.getEventType(s) && !HolmesServices.isUnsentLog(s) && this.appendReqItem(s));
            this.showLoading();
            let a = i[e[0].id];
            if (a) {
                let e = a.data;
                n.empty(), n.accordion({
                    collapsible: !0,
                    animate: !1,
                    icons: !1,
                    heightStyle: "content",
                    active: !1
                }), this.initAccordion = !0;
                for (let i in e) {
                    let s = e[i];
                    s.g.length && s.g.forEach(e => {
                        t.getEventType(e) && !HolmesServices.isUnsentLog(e) && this.appendReqItem(e)
                    })
                }
            } else this.showFailure();
            this.hideLoading(), this.isRendered = !0
        },
        showFailure() {
            $("#accordion").html('<span class="error">尚未产生服务器请求，如果该页面加载于百度统计助手安装之前，请尝试刷新后再重新执行监听</span>')
        }
    },
    o = (t, ...e) => {
        chrome.windows.getCurrent(function(i) {
            if (!i) return;
            let s = i.id,
                n = e.pop();
            chrome.tabs.query({
                active: !0,
                windowId: s
            }, function(i) {
                t.call(n, i, ...e)
            })
        })
    };

    // Initial load
    (async function() {
        // let t = s.getMetaData();
        let t = await sendMessage("GET_METADATA");
        o(n.show, t, n)
    })();

    let c = (t, ...e) => {
        let i = t[0].id,
            s = e[0],
            n = e[1];
        chrome.tabs.sendMessage(i, s, function(t) {
            n && n(t)
        })
    };

    chrome.runtime.onMessage.addListener((t, e, i) => {
        if ("RECEIVEDREQUEST" === t.type) {
            let e = $("#tabs").tabs("option", "active"),
                i = JSON.parse(t.data);
            
            // We need metadata for show calls
            sendMessage("GET_METADATA").then(metadata => {
                 "g" === i.type && 1 === e && o(a.show, metadata, i, a), o(n.show, metadata, i, n)
            });
        }
        if ("RESET" === t.type && (a.reset(), n.reset()), "REFRESH" === t.type) {
            let t = $("#tabs").tabs("option", "active");
            
            sendMessage("GET_METADATA").then(metadata => {
                n.isEmpty && o(n.showFailure, metadata, n), a.isEmpty && 1 === t && o(a.showFailure, metadata, a)
            });
        }
        "GETCLIENTID" === t.type && t.data && $(".main").prepend(utils.prependMessage(`您的客户端 ID 是 ${t.data}`))
    }), $("#tabs").tabs({
        activate(t, e) {
            sendMessage("GET_METADATA").then(metadata => {
                e.newTab.is("#tabs2-li") && o(a.show, metadata, a)
            });
        }
    }), async function() {
        const t = chrome.runtime.connect({
            name: "hm-code-checker"
        });
        let nSelector = $(".ua-select");
        
        // e = s.getUaType()
        let uaType = await sendMessage("GET_UA_TYPE");
        
        nSelector.find("option[value=" + uaType + "]").attr("selected", !0), nSelector.on("change.select", function(t) {
            let e = $.trim($(this).val());
            o(c, {
                uaType: e,
                type: "SETUA"
            }, this)
        }), $(".login-link").on("click", function() {
            o(function(t) {
                // s.resetCacheResult(t[0].id)
                sendMessage("RESET_CACHE_RESULT", {tabId: t[0].id});
            }, this)
        });
        const aCheckbox = $("#heatmap");
        
        // i = s.getCookieStatus()
        let cookieStatus = await sendMessage("GET_COOKIE_STATUS");
        
        aCheckbox.prop("checked", cookieStatus), aCheckbox.on("click", function(e) {
            const i = e.target.checked;
            $(this).prop("checked", i), t.postMessage({
                type: "COOKIE_STATUS",
                data: i
            })
        }), o(c, {
            type: "GETCLIENTID"
        }, this)
    }(), HolmesServices.checkoutVersion("0.0.7", function(t) {
        -1 === t && $(".main").prepend(utils.prependMessage('版本更新了，点击<a href="https://tongji.baidu.com/static/tongji/hm-debugger/upgrade.html" target="_blank">此处</a>下载安装吧</div>'))
    })
});
