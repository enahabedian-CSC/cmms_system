// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WebApp.gs — CSC CMMS v5.0                                              ║
// ║  HtmlService entry point.  doGet() is the only public surface.         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
//  doGet — web app entry point
// ═══════════════════════════════════════════════════════════════════════════════

function doGet(e) {
  var userInfo = getCurrentUserInfo();

  if (userInfo.role === ROLES.NOACCESS) {
    var denied = HtmlService.createTemplateFromFile('frontend/access-denied');
    denied.userEmail    = userInfo.email || '';
    denied.companyName  = getConfigValue('Company Name') || 'Container Supply Co.';
    return denied.evaluate()
      .setTitle('Access Required — CSC Maintenance')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var tmpl = HtmlService.createTemplateFromFile('frontend/index');
  tmpl.userInfoJson  = JSON.stringify(userInfo);
  tmpl.companyName   = getConfigValue('Company Name') || 'Container Supply Co.';
  tmpl.systemVersion = getConfigValue('System Version') || '5.0';

  return tmpl.evaluate()
    .setTitle('CSC Maintenance Console')
    .addMetaTag('viewport', 'width=1280')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── Template include helper ───────────────────────────────────────────────────
// Usage in .html templates: <?!= include_('frontend/partials/foo') ?>

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
