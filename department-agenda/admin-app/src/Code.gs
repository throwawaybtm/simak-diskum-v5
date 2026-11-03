/**
 * admin-app/src/Code.gs
 * Google Apps Script Web App Entrypoint for Dinas Koperasi Batam Admin Management.
 * Serves responsive full-screen UI and exposes server-side RPC methods for google.script.run.
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Admin - Agenda Kegiatan Dinas Koperasi Batam')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Top-level RPC proxies for google.script.run
function apiCreateActivity(input, requestId, actorLabel, acknowledgeConflict, overrideReason) {
  return ActivityApi.createActivity(input, requestId, actorLabel, acknowledgeConflict, overrideReason);
}

function apiUpdateActivity(id, input, expectedVersion, requestId, actorLabel, acknowledgeConflict, overrideReason) {
  return ActivityApi.updateActivity(id, input, expectedVersion, requestId, actorLabel, acknowledgeConflict, overrideReason);
}

function apiCancelActivity(id, reason, expectedVersion, requestId, actorLabel) {
  return ActivityApi.cancelActivity(id, reason, expectedVersion, requestId, actorLabel);
}

function apiCompleteActivity(id, expectedVersion, requestId, actorLabel) {
  return ActivityApi.completeActivity(id, expectedVersion, requestId, actorLabel);
}

function apiDuplicateActivity(id) {
  return ActivityApi.duplicateActivity(id);
}

function apiGetAdminActivities(filters) {
  return ActivityApi.getAdminActivities(filters);
}

function apiGetAdminExport(filters, format) {
  return ActivityApi.getAdminExport(filters, format);
}

function apiGetMasterData() {
  return MasterApi.getMasterData();
}

function apiSaveMasterData(kind, input, actorLabel) {
  return MasterApi.saveMasterData(kind, input, actorLabel);
}

function apiDeactivateMasterData(kind, id, actorLabel) {
  return MasterApi.deactivateMasterData(kind, id, actorLabel);
}

function apiSaveAnnouncement(input, actorLabel) {
  return MasterApi.saveAnnouncement(input, actorLabel);
}

function apiGetAuditHistory(limit) {
  return MasterApi.getAuditHistory(limit);
}
