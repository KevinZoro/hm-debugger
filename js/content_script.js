let currentClientId;
chrome.runtime.onMessage.addListener(function(e, t, n) {
    if ("SETUA" === e.type) chrome.runtime.sendMessage({
        uaType: e.uaType,
        type: e.type
    }, function(e) {
        window.location.reload()
    });
    else if ("IFRAME" === e.type) {
        e.data.isIFrameForbidden && window.postMessage({
            type: "HolmesHeatMapIFrameForbidden"
        }, "*")
    } else "GETCLIENTID" === e.type && chrome.runtime.sendMessage({
        type: "GETCLIENTID",
        data: currentClientId
    })
}),
function() {
    window.addEventListener("message", e => {
        const {
            type: t,
            clientId: n
        } = e.data;
        "HolmesGetClientID" === t && n && (currentClientId = n)
    }, !1);
    const e = "(" + function() {
        window._hmt = window._hmt || [], window._hmt.push(["_getClientId", e => {
            e && console.log("%c百度%c统计%c：您的客户端 ID 是 " + e, "color:white;background-color:red;", "background-color: blue; color: white;", "background-color:none;color: #bada55;"), window.postMessage({
                type: "HolmesGetClientID",
                clientId: e
            }, "*")
        }])
    } + ")();",
        t = document.createElement("script");
    t.textContent = e, (document.head || document.documentElement).appendChild(t), t.remove()
}(),
function() {
    ! function(e) {
        let t = document.createElement("script");
        t.setAttribute("type", "text/javascript"), t.src = chrome.runtime.getURL(e), t.onload = function() {
            this.parentNode.removeChild(this)
        }, document.head.appendChild(t)
    }("js/auto_event.js")
}(),
function() {
    const {
        origin: e
    } = new URL(location.href);
    if (["https://tongji.baidu.com", "https://circular.baidu-int.com"].includes(e) && window.self === window.parent) {
        let e = document.createElement("meta");
        e.setAttribute("http-equiv", "Content-Security-Policy"), e.setAttribute("content", "upgrade-insecure-requests");
        let t = document.querySelector("head");
        t && t.appendChild(e)
    }
}();
