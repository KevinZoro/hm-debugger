const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1";
const REG_HM_JS = /\/\/hm\.baidu\.com\/(hm?\.js)\?(\w+)/i;
const REG_HM_GIF = /\/\/hm\.baidu\.com\/hm\.gif/gi;

let heatmapUserAgent = "pc";
let uaType = "pc";
let cookieStatus = false;
let metaData = {};
let filterMetaData = {};
let cookies = {};

const utils = {
    isObject: e => {
        let t = typeof e;
        return "function" === t || "object" === t && !!e
    },
    isString: e => "[object String]" === Object.prototype.toString.call(e),
    isEmptyObject: e => 0 === Object.keys(e).length,
    isJsonString(e) {
        if (!utils.isString(e)) return !1;
        try {
            return JSON.parse(e), !0
        } catch (e) {
            return !1
        }
    },
    parseUrl(e) {
        let t, a = e.split("?")[1],
            r = {},
            s = /([^&]*)=([^&]*)/g;
        for (; t = s.exec(a);) {
            let e = t[1],
                a = t[2];
            r[e] ? (r[e] = Array.isArray(r[e]) ? r[e] : [r[e]], r[e].push(utils.isJsonString(decodeURIComponent(a)) ? JSON.parse(decodeURIComponent(a)) : decodeURIComponent(a))) : r[e] = utils.isJsonString(decodeURIComponent(a)) ? JSON.parse(decodeURIComponent(a)) : decodeURIComponent(a)
        }
        return r
    },
    formatData(e) {
        let t = {};
        return e.forEach(function(e) {
            t[e.name] = e.value
        }), t
    }
};

// DNR Rule for UA Switching
async function updateUARule() {
    const isMobile = (uaType === "mobile" || heatmapUserAgent === "mobile");
    const ruleId = 2;
    
    if (isMobile) {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId],
            addRules: [{
                id: ruleId,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [{
                        header: "User-Agent",
                        operation: "set",
                        value: UA_MOBILE
                    }]
                },
                condition: {
                    urlFilter: "|*",
                    resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script", "image", "stylesheet", "object", "ping", "csp_report", "media", "websocket", "other"]
                }
            }]
        });
    } else {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId]
        });
    }
}


chrome.webNavigation.onBeforeNavigate.addListener(function(e) {
    if (0 === e.frameId) {
        let t = e.tabId;
        metaData[t] = {
            data: {}
        };
        filterMetaData[t] = {
            data: {},
            result: null
        };
        chrome.runtime.sendMessage({
            type: "RESET"
        }).catch(() => {});
    }
});

chrome.webNavigation.onCompleted.addListener(function(e) {
    chrome.runtime.sendMessage({
        type: "REFRESH"
    }).catch(() => {});
}, {
    urls: ["<all_urls>"]
});

chrome.tabs.onRemoved.addListener(function(e) {
    if (metaData[e]) {
        // metaData[e] = "empty"; // Keeping it as string 'empty' as in original code
        delete metaData[e]; // Better to delete it to save memory? Original code set it to "empty".
        // Let's stick to original behavior just in case
        metaData[e] = "empty";
    }
});

chrome.webRequest.onBeforeRequest.addListener(function(e) {
    const {
        frameId: t,
        parentFrameId: a,
        url: r
    } = e;
    
    if (cookieStatus) {
        // Deprecated: chrome.tabs.getSelected. Using query.
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let tab = tabs[0];
            if (!tab || !tab.url) return;
            const s = tab.url;
            const o = new URL(s);
            
            if (["https://tongji.baidu.com", "https://circular.baidu-int.com"].indexOf(o.origin || "") !== -1 && 0 !== t && 0 === a) {
                if (!cookies[t]) cookies[t] = [];
                
                chrome.cookies.getAll({
                    url: r
                }, e => {
                    e.forEach(e => {
                        const {
                            domain: a,
                            name: s,
                            value: o,
                            session: i,
                            secure: n,
                            expirationDate: u,
                            path: c,
                            storeId: d,
                            sameSite: l
                        } = e;
                        const m = i ? {} : {
                            expirationDate: u
                        };
                        
                        if (!n || "no_restriction" !== l) {
                            chrome.cookies.set({
                                url: r,
                                domain: a,
                                name: s,
                                path: c,
                                storeId: d,
                                sameSite: "no_restriction",
                                secure: true,
                                value: o,
                                ...m
                            });
                            
                            if (!cookies[t].find(e => e.domain === a && e.path === c && e.name === s && e.value === o)) {
                                cookies[t].push({ ...e,
                                    url: r
                                });
                            }
                        }
                    })
                });
            }
        });
    }
}, {
    urls: ["<all_urls>"]
}, []); // No blocking

chrome.webRequest.onBeforeSendHeaders.addListener(function(e) {
    // Logic for capturing requests (non-blocking)
    let t, a = e.url,
        r = e.tabId,
        s = e.requestId,
        o = "";
        
    if (a.match(REG_HM_JS)) {
        let i = a.match(REG_HM_JS),
            n = i[1];
        t = i[2];
        o = utils.formatData(e.requestHeaders || []).Referer || "";
        
        if (!metaData[r]) metaData[r] = { data: {} };
        if (!metaData[r].data[t]) metaData[r].data[t] = { j: [], g: [] };
        
        let u = {
            type: n,
            url: a,
            referer: o,
            requestId: s,
            si: t
        };
        metaData[r].data[t].j.push(u);
    } else if (a.match(REG_HM_GIF)) {
        o = utils.formatData(e.requestHeaders || []).Referer || "";
        let i = utils.parseUrl(a);
        if (t = i.si, "empty" === metaData[r]) return;
        
        if (!metaData[r]) metaData[r] = { data: {} };
        if (!metaData[r].data[t]) metaData[r].data[t] = { j: [], g: [] };
        
        i.url = a;
        i.referer = o;
        i.requestId = s;
        metaData[r].data[t].g.push(i);
    }
    
}, {
    urls: ["<all_urls>"]
}, ["requestHeaders", "extraHeaders"]); // No blocking

let initMetaObject = (e, t) => {
    filterMetaData[e] || (filterMetaData[e] = {
        data: {}
    }), filterMetaData[e].data[t] || (filterMetaData[e].data[t] = {
        j: [],
        g: []
    })
};

function sendRequestMessage(e, t) {
    chrome.windows.getCurrent(function(a) {
        if (!a) return;
        let r = a.id;
        chrome.tabs.query({
            active: !0,
            windowId: r
        }, function(a) {
            if (a && a[0] && t === a[0].id) {
                chrome.runtime.sendMessage({
                    type: "RECEIVEDREQUEST",
                    data: JSON.stringify(e)
                }).catch(() => {});
            }
        })
    })
}

function getMetaDataByTab(e) {
    return metaData[e.id]
}

function getMetaData() {
    let e = {};
    for (let t in filterMetaData)
        filterMetaData.hasOwnProperty(t) && filterMetaData[t].data && !utils.isEmptyObject(filterMetaData[t].data) && (e[t] = filterMetaData[t]);
    return e
}

function getCheckResultBySiList(e, t) {
    let a = e.siList;
    
    // Replace $.ajax with fetch
    const params = new URLSearchParams();
    params.append('si', a);
    params.append('method', 'home/js/check/signatureCheck');
    
    fetch("https://tongji.baidu.com/sc-web/ajax/post", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
        },
        body: params
    })
    .then(response => response.json())
    .then(data => {
         // The original code passed (data, status). jQuery success callback args: (data, textStatus, jqXHR).
         // The original code used: t(e, e.status) where e is data.
         // But wait, standard jQuery .done(function(data, textStatus, jqXHR))
         // The original code: .done(function(e, a, r){ ... t(e, e.status) ... })
         // So e is data.
         try {
             t(data, data.status);
         } catch (e) {
             console.log("error", e);
         }
    })
    .catch(error => {
        console.log("error", error);
    });
}

function cacheResult(e, t) {
    if (filterMetaData[e]) {
        filterMetaData[e].result = t;
    }
}

function resetCacheResult(e) {
    if (filterMetaData[e]) {
        filterMetaData[e].result = null;
    }
}

function setUaType(e) {
    uaType = e;
    updateUARule();
}

function getUaType() {
    return uaType || "pc"
}

function setCookieStatus(e) {
    cookieStatus = e;
}

function getCookieStatus(e) {
    return cookieStatus || !1
}

chrome.webRequest.onHeadersReceived.addListener(function(e) {
    let t = e.url,
        a = e.tabId,
        r = e.requestId;
    if (0 === e.frameId) {
        if ((t.match(REG_HM_JS) || t.match(REG_HM_GIF)) && (200 == +e.statusCode || 304 == +e.statusCode) && "ping" !== e.type) {
            if (t.match(REG_HM_JS)) {
                let s = utils.formatData(e.responseHeaders || []),
                    o = t.match(REG_HM_JS)[2],
                    i = s["Content-Length"];
                if (304 === e.statusCode) i = 1;
                
                if (metaData[a] && metaData[a].data[o] && metaData[a].data[o].j) {
                    metaData[a].data[o].j.forEach(function(e, n) {
                        if (e.requestId === r) {
                            metaData[a].data[o].j[n].contentLength = i;
                            initMetaObject(a, o);
                            filterMetaData[a].data[o].j.push(metaData[a].data[o].j[n]);
                            sendRequestMessage(Object.assign(e, {
                                type: "j"
                            }), a);
                        }
                    });
                }
            }
            if (t.match(REG_HM_GIF)) {
                let si = utils.parseUrl(t).si;
                if (metaData[a] && metaData[a].data[si] && metaData[a].data[si].g) {
                    metaData[a].data[si].g.forEach(function(t) {
                        if (t.requestId === r) {
                            initMetaObject(a, si);
                            filterMetaData[a].data[si].g.push(t);
                            sendRequestMessage(Object.assign(t, {
                                type: "g"
                            }), a);
                        }
                    });
                }
            }
        }
    } else if (/jn=pageclick/.test(e.url)) {
        let t = utils.formatData(e.responseHeaders || []),
            r = !1;
        if (t["X-Frame-Options"] && "allowall" !== t["X-Frame-Options"].toLowerCase()) {
            if (metaData[a]) metaData[a].isIFrameForbidden = !0;
            if (filterMetaData[a]) filterMetaData[a].isIFrameForbidden = !0;
            r = !0;
        }
        
        chrome.tabs.query({
            active: !0,
            currentWindow: !0
        }, function(tabs) {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "IFRAME",
                    data: {
                        isIFrameForbidden: r
                    }
                }).catch(() => {});
            }
        });
    }
}, {
    urls: ["<all_urls>"]
}, ["responseHeaders"]); // No blocking

chrome.runtime.onMessage.addListener(function(e, t, sendResponse) {
    if ("SETUA" === e.type) {
        setUaType(e.uaType);
        sendResponse("SETUADONE");
    }
    if ("HEATMAP_SETUA" === e.type) {
        heatmapUserAgent = e.uaType;
        updateUARule();
        sendResponse("HEATMAP_SETUA_DONE");
    }
    
    // Add handlers for getters which were likely accessed directly in V2 or via some messaging
    // The original code didn't seem to expose getters via message, 
    // but DevTools page might need to access them.
    // In MV2, DevTools `chrome.extension.getBackgroundPage()` allows direct access to window object.
    // In MV3, this is NOT possible. DevTools must use messaging.
    
    if (e.type === "GET_METADATA") {
        sendResponse(getMetaData());
    }
    if (e.type === "GET_METADATA_BY_TAB") {
        sendResponse(getMetaDataByTab(e.tab));
    }
    if (e.type === "GET_UA_TYPE") {
        sendResponse(getUaType());
    }
    if (e.type === "GET_COOKIE_STATUS") {
        sendResponse(getCookieStatus());
    }
    if (e.type === "CHECK_RESULT") {
         getCheckResultBySiList(e.data, (data, status) => {
             // We can't return async result easily in this structure unless we keep the channel open.
             // But the original code passed a callback `t`.
             // `getCheckResultBySiList` takes (e, t).
             // Let's assume the caller expects a message back or we just cache it?
             // The original code was likely called directly via `bg.getCheckResultBySiList(...)`.
             
             // I need to implement a mechanism to return this data.
             sendResponse({data, status});
         });
         return true; // Keep channel open
    }
    if (e.type === "CACHE_RESULT") {
        cacheResult(e.tabId, e.result);
        sendResponse("OK");
    }
    if (e.type === "RESET_CACHE_RESULT") {
        resetCacheResult(e.tabId);
        sendResponse("OK");
    }
    if (e.type === "SET_COOKIE_STATUS") {
        setCookieStatus(e.status);
        sendResponse("OK");
    }
    
    // Return true for async response if needed, but for sync ones it's fine.
});

chrome.runtime.onConnect.addListener(e => {
    e.onMessage.addListener(({
        type: msgType,
        data: t
    }) => {
        switch (msgType) {
            case "COOKIE_STATUS":
                cookieStatus = t;
                if (!t && cookies) {
                    Object.keys(cookies).forEach(e => {
                        cookies[e].forEach(e => {
                            const {
                                url: t,
                                domain: a,
                                name: r,
                                value: s,
                                sameSite: o,
                                secure: i,
                                session: n,
                                expirationDate: u,
                                path: c,
                                storeId: d,
                                httpOnly: l
                            } = e;
                            const m = n ? {} : {
                                expirationDate: u
                            };
                            chrome.cookies.set({
                                url: t,
                                domain: a,
                                httpOnly: l,
                                name: r,
                                path: c,
                                storeId: d,
                                sameSite: o,
                                secure: i,
                                value: s,
                                ...m
                            });
                        })
                    });
                    cookies = {};
                }
                break;
        }
    })
});
