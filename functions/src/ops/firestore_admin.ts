import admin from "firebase-admin";

let is_inited = false;

function ensure_init() {
  if (!is_inited) {
    admin.initializeApp();
    is_inited = true;
  }
}

export function get_firestore() {
  ensure_init();
  return admin.firestore();
}

export function get_messaging() {
  ensure_init();
  return admin.messaging();
}
