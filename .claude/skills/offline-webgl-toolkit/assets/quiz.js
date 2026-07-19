/* quiz.js — データ駆動のインタラクティブ・クイズ（依存なし・file://可）
   使い方:
     Quiz.mount("#quiz", {
       title: "理解度チェック",
       questions: [
         { q:"問題文（HTML可）", opts:["選択肢A","選択肢B","選択肢C"],
           answer:1, explain:"解説（HTML可）" }
       ]
     });
   - answer は正解の選択肢インデックス（0始まり）
   - 「答え合わせ」で正誤・解説・スコアを表示。「もう一度」でリセット
   グローバル: window.Quiz
*/
(function (global) {
  "use strict";

  // スタイルは一度だけ注入（各章のCSSに依存しない自己完結）
  var STYLE_ID = "quiz-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      ".quizbox{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px 24px;margin:2em 0;}",
      ".quizbox .qhead{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--photon);margin-bottom:.3em;}",
      ".quizbox h3{margin:.1em 0 1.2em;}",
      ".qitem{border-top:1px solid var(--line);padding:18px 0;}",
      ".qitem:first-of-type{border-top:none;padding-top:4px;}",
      ".qitem .qq{font-weight:640;color:var(--ink);margin-bottom:.9em;}",
      ".qitem .qq .qno{font-family:var(--mono);color:var(--spec);margin-right:.5em;}",
      ".qopts{display:flex;flex-direction:column;gap:.55em;}",
      ".qopt{display:flex;align-items:flex-start;gap:.7em;padding:9px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;transition:.12s;background:var(--panel-2);}",
      ".qopt:hover{border-color:var(--line-2);}",
      ".qopt input{margin-top:.28em;accent-color:var(--photon);cursor:pointer;flex:none;}",
      ".qopt span{color:var(--ink);}",
      ".qopt.sel{border-color:var(--photon);}",
      ".qopt.correct{border-color:var(--good);background:rgba(127,227,161,.10);}",
      ".qopt.wrong{border-color:var(--bad);background:rgba(255,122,122,.10);}",
      ".qopt .mark{margin-left:auto;font-family:var(--mono);font-size:12px;flex:none;}",
      ".qopt.correct .mark{color:var(--good);}",
      ".qopt.wrong .mark{color:var(--bad);}",
      ".qexplain{margin-top:.8em;font-size:13.5px;color:var(--ink-dim);background:var(--bg);border-left:3px solid var(--line-2);border-radius:6px;padding:10px 14px;display:none;}",
      ".qexplain.show{display:block;}",
      ".qexplain b{color:var(--ink);}",
      ".qfoot{display:flex;align-items:center;gap:16px;margin-top:18px;flex-wrap:wrap;}",
      ".qbtn{font-family:var(--mono);font-size:13px;color:#12160e;background:var(--photon);border:1px solid var(--photon);border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:600;}",
      ".qbtn:hover{filter:brightness(1.06);}",
      ".qbtn.ghost{color:var(--ink-dim);background:var(--panel-2);border-color:var(--line-2);font-weight:400;}",
      ".qbtn.ghost:hover{color:var(--photon);border-color:var(--photon);filter:none;}",
      ".qscore{font-family:var(--mono);font-size:14px;color:var(--ink);}",
      ".qscore .n{color:var(--photon);font-weight:600;font-size:16px;}",
      ".qscore.pass .n{color:var(--good);}"
    ].join("");
    var el = document.createElement("style");
    el.id = STYLE_ID; el.textContent = css;
    document.head.appendChild(el);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount(target, cfg) {
    injectStyle();
    var root = (typeof target === "string") ? document.querySelector(target) : target;
    if (!root) return null;
    root.innerHTML = "";
    var uid = "q" + Math.random().toString(36).slice(2, 8);
    var qs = cfg.questions || [];
    var box = el("div", "quizbox");
    box.appendChild(el("div", "qhead", "Check your understanding"));
    box.appendChild(el("h3", null, cfg.title || "理解度チェック"));

    var items = [];
    qs.forEach(function (item, qi) {
      var wrap = el("div", "qitem");
      wrap.appendChild(el("div", "qq", '<span class="qno">Q' + (qi + 1) + '</span>' + item.q));
      var opts = el("div", "qopts");
      var optEls = [];
      item.opts.forEach(function (text, oi) {
        var lab = el("label", "qopt");
        var input = document.createElement("input");
        input.type = "radio"; input.name = uid + "_" + qi; input.value = String(oi);
        lab.appendChild(input);
        lab.appendChild(el("span", null, text));
        lab.appendChild(el("span", "mark", ""));
        input.addEventListener("change", function () {
          optEls.forEach(function (o) { o.lab.classList.remove("sel"); });
          lab.classList.add("sel");
        });
        opts.appendChild(lab);
        optEls.push({ lab: lab, input: input, mark: lab.querySelector(".mark") });
      });
      wrap.appendChild(opts);
      var explain = el("div", "qexplain", "<b>解説：</b>" + (item.explain || ""));
      wrap.appendChild(explain);
      box.appendChild(wrap);
      items.push({ optEls: optEls, explain: explain, answer: item.answer });
    });

    var foot = el("div", "qfoot");
    var checkBtn = el("button", "qbtn", "答え合わせ");
    var resetBtn = el("button", "qbtn ghost", "もう一度");
    resetBtn.style.display = "none";
    var score = el("div", "qscore", "");
    foot.appendChild(checkBtn);
    foot.appendChild(resetBtn);
    foot.appendChild(score);
    box.appendChild(foot);
    root.appendChild(box);

    function grade() {
      var correct = 0;
      items.forEach(function (it) {
        var pick = -1;
        it.optEls.forEach(function (o, oi) { if (o.input.checked) pick = oi; o.input.disabled = true; });
        it.optEls.forEach(function (o, oi) {
          o.lab.classList.remove("sel");
          if (oi === it.answer) { o.lab.classList.add("correct"); o.mark.textContent = "正解"; }
          if (oi === pick && pick !== it.answer) { o.lab.classList.add("wrong"); o.mark.textContent = "✕"; }
        });
        if (pick === it.answer) correct++;
        it.explain.classList.add("show");
      });
      var total = items.length;
      score.innerHTML = 'スコア <span class="n">' + correct + " / " + total + "</span>";
      if (correct === total) score.classList.add("pass");
      checkBtn.style.display = "none";
      resetBtn.style.display = "";
    }

    function reset() {
      items.forEach(function (it) {
        it.optEls.forEach(function (o) {
          o.input.disabled = false; o.input.checked = false;
          o.lab.classList.remove("sel", "correct", "wrong"); o.mark.textContent = "";
        });
        it.explain.classList.remove("show");
      });
      score.textContent = ""; score.classList.remove("pass");
      checkBtn.style.display = ""; resetBtn.style.display = "none";
    }

    checkBtn.addEventListener("click", grade);
    resetBtn.addEventListener("click", reset);
    return { grade: grade, reset: reset };
  }

  global.Quiz = { mount: mount };
})(window);
