# price_alert (serverless + cron + push)

## 핵심
- Next.js(PWA) + Firebase Functions(HTTP) + Firestore + FCM
- GitHub Actions cron -> Functions `/run_price_check` 호출
- 규칙(rule) 당 1회/일 (Asia/Seoul 기준)

## 환경변수
- 루트 `.env.example` 참고
- `functions/.env.example` 참고

## 보안 원칙
- 클라이언트 Firestore 직접 쓰기 금지 (rules에서 차단)
- 모든 쓰기/수정은 Functions HTTP API로만
- cron endpoint는 `x-cron-secret` 필수

## 개발
- `apps/web`: Next.js
- `functions`: Firebase Cloud Functions (express onRequest)
