/**
 * public-app/src/Code.gs
 * Google Apps Script Web App Entrypoint for Public Activity Portal.
 * Read-only scopes (spreadsheets.readonly) and default framing.
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Agenda Resmi - Dinas Koperasi dan Usaha Mikro Kota Batam')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Read-only server proxies for google.script.run
function apiGetDashboardData() {
  return PublicApi.getDashboardData();
}

function apiGetPublicActivities(filters) {
  return PublicApi.getPublicActivities(filters);
}

function apiGetPublicExport(filters, format) {
  return PublicApi.getPublicExport(filters, format);
}
