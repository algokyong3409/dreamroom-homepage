/*
 * 관리자 로그인 (클라이언트 전용 간단 비밀번호 게이트)
 *
 * 이 사이트는 서버/데이터베이스가 없는 정적 HTML이라, 이 스크립트는
 * "진짜" 보안 인증이 아닙니다 — 비밀번호 해시가 이 파일 안에 그대로
 * 들어있고, 웹 개발자 도구로 통과시키는 것도 기술적으로는 가능합니다.
 * 실수로 페이지를 벗어나거나(예: 관리 도구 UI가 나중에 추가될 때)
 * 일반 방문자와 구분하는 용도로만 사용하세요. 실제로 중요한 데이터를
 * 이 게이트 뒤에 두지 마세요.
 *
 * 비밀번호를 바꾸려면:
 *   1) 아래 ADMIN_PASSWORD_HASH를 새 비밀번호의 SHA-256 해시로 교체
 *      (예: 브라우저 콘솔에서
 *        crypto.subtle.digest('SHA-256', new TextEncoder().encode('새비밀번호'))
 *          .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
 *      실행하면 해시 값이 콘솔에 출력됩니다.)
 *   2) 기본 비밀번호는 "dreamroom2026" 입니다 — 반드시 바꿔서 사용하세요.
 */
(function () {
  var ADMIN_PASSWORD_HASH = '79792b14d5306411733c690ba7aa950d8b541029cfedcf0b3a53b7c03a555e0a';
  var STORAGE_KEY = 'dreamroom_admin';

  function isAdmin() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function setAdmin(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function injectStyle() {
    if (document.getElementById('admin-login-style')) return;
    var style = document.createElement('style');
    style.id = 'admin-login-style';
    style.textContent =
      '.admin-login-card .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
      '.admin-login-overlay{position:fixed;inset:0;background:rgba(20,26,28,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}' +
      '.admin-login-overlay[hidden]{display:none}' +
      '.admin-login-card{background:#fff;border-radius:14px;padding:28px 26px;width:100%;max-width:340px;box-shadow:0 20px 50px rgba(0,0,0,.25);position:relative;font-family:inherit}' +
      '.admin-login-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border:0;background:transparent;color:#8a9295;font-size:20px;line-height:1;cursor:pointer;border-radius:50%}' +
      '.admin-login-close:hover{background:#f1f3f3}' +
      '.admin-login-title{margin:0 0 6px;font-size:18px;font-weight:900;color:#1c2426}' +
      '.admin-login-sub{margin:0 0 18px;font-size:12.5px;color:#8a9295}' +
      '.admin-login-card input[type=password]{width:100%;height:44px;border:1px solid #d8dcde;border-radius:8px;padding:0 14px;font-size:15px;box-sizing:border-box;outline:0}' +
      '.admin-login-card input[type=password]:focus{border-color:#4285f4}' +
      '.admin-login-error{min-height:18px;margin:8px 2px 0;font-size:12.5px;color:#e0453f}' +
      '.admin-login-submit{width:100%;height:44px;margin-top:12px;border:0;border-radius:8px;background:#111;color:#fff;font-size:15px;font-weight:700;cursor:pointer}' +
      '.admin-login-submit:hover{background:#2b2b2b}' +
      '.admin-login-badge{display:none;align-items:center;gap:4px}' +
      'body.is-admin .admin-login-badge{display:flex}' +
      'body.is-admin .admin-login-guest{display:none}';
    document.head.appendChild(style);
  }

  function buildModal() {
    var overlay = document.createElement('div');
    overlay.className = 'admin-login-overlay';
    overlay.id = 'adminLoginOverlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="admin-login-card" role="dialog" aria-modal="true" aria-labelledby="adminLoginTitle">' +
        '<button type="button" class="admin-login-close" aria-label="닫기">&times;</button>' +
        '<h2 class="admin-login-title" id="adminLoginTitle">관리자 로그인</h2>' +
        '<p class="admin-login-sub">콘텐츠 관리 권한이 있는 담당자만 이용하세요.</p>' +
        '<form id="adminLoginForm">' +
          '<label class="sr-only" for="adminLoginPw">비밀번호</label>' +
          '<input type="password" id="adminLoginPw" autocomplete="current-password" placeholder="비밀번호">' +
          '<div class="admin-login-error" id="adminLoginError" aria-live="polite"></div>' +
          '<button type="submit" class="admin-login-submit">로그인</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function openModal(overlay) {
    overlay.hidden = false;
    var pw = overlay.querySelector('#adminLoginPw');
    var err = overlay.querySelector('#adminLoginError');
    err.textContent = '';
    pw.value = '';
    setTimeout(function () { pw.focus(); }, 0);
  }
  function closeModal(overlay) {
    overlay.hidden = true;
  }

  function updateLoginLinks() {
    var admin = isAdmin();
    document.body.classList.toggle('is-admin', admin);
    document.querySelectorAll('a[href="#login"]').forEach(function (link) {
      if (!link.dataset.adminOrigText) link.dataset.adminOrigText = link.innerHTML;
      link.innerHTML = admin ? link.dataset.adminOrigText.replace(/LOGIN/i, '로그아웃') : link.dataset.adminOrigText;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectStyle();
    var overlay = buildModal();
    var form = overlay.querySelector('#adminLoginForm');
    var pwInput = overlay.querySelector('#adminLoginPw');
    var errBox = overlay.querySelector('#adminLoginError');

    updateLoginLinks();

    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href="#login"]');
      if (!link) return;
      event.preventDefault();
      if (isAdmin()) {
        setAdmin(false);
        updateLoginLinks();
      } else {
        openModal(overlay);
      }
    });

    overlay.querySelector('.admin-login-close').addEventListener('click', function () {
      closeModal(overlay);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal(overlay);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) closeModal(overlay);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = pwInput.value;
      if (!value) return;
      sha256Hex(value).then(function (hash) {
        if (hash === ADMIN_PASSWORD_HASH) {
          setAdmin(true);
          updateLoginLinks();
          closeModal(overlay);
        } else {
          errBox.textContent = '비밀번호가 올바르지 않습니다.';
          pwInput.value = '';
          pwInput.focus();
        }
      });
    });
  });
})();
