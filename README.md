# 온기한식뷔페 프로젝트 — PRD 및 마이그레이션 파일

파일 목록 (이 디렉토리를 Codex CLI에 읽히도록 프로젝트 루트에 복사하세요):
- PRD.md
- migrations/001_create_schema.sql
- migrations/002_rls_policies.sql
- types/supabase.ts
- README.md

## 사용 방법 (요약)
1. Supabase 프로젝트 생성 후 DB 접속 정보 준비.
2. migrations/001_create_schema.sql과 migrations/002_rls_policies.sql을 실행하여 스키마 및 RLS 적용.
   - 방법 A (psql):
     psql "postgres://<user>:<pass>@<host>:5432/postgres" -f migrations/001_create_schema.sql
     psql "postgres://..." -f migrations/002_rls_policies.sql
   - 방법 B (Supabase CLI, 이 프로젝트에서는 npm 스크립트를 사용):
     npm run supabase -- login
     npm run supabase -- db push --file migrations/001_create_schema.sql
     npm run supabase -- db push --file migrations/002_rls_policies.sql
3. types/supabase.ts 파일을 프로젝트의 types/ 폴더에 복사하거나, Supabase CLI로 자동 생성:
   npm run supabase -- gen types typescript --schema public > types/supabase.ts
4. Next.js 프로젝트 환경변수 설정 (Vercel):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (서버 전용, 절대 클라이언트에 노출 금지)

## Codex CLI에 넘길 프롬프트 예시
아래를 Codex CLI에 붙여넣으면 마이그레이션 파일/타입 파일 생성을 도와주도록 지시할 수 있습니다.

```
Generate a PostgreSQL migration for Supabase and TypeScript types.

Input files provided in project folder:
- migrations/001_create_schema.sql
- migrations/002_rls_policies.sql

Tasks:
1) Validate SQL files for syntax errors; if errors found, output line-by-line fixes.
2) Generate a `types/supabase.ts` (TypeScript) matching the SQL schema if not present.
3) Produce a short README (this README.md is acceptable) explaining how to run migrations with psql or supabase CLI.
4) Ensure no SUPABASE_SERVICE_ROLE_KEY is hardcoded in any generated client code.
```

## 검증 체크리스트
- SQL이 psql로 실행되는지
- company.code UNIQUE 제약 동작 확인
- entry.count 제약(1~20) 동작 확인
- Payment.total_amount 계산 동작 확인
- Supabase Storage 업로드 및 Signed URL 발급 확인
- RLS 적용 후 권한 테스트

## 추가 노트
- Codex/자동 생성 결과는 반드시 수동 검토 후 프로덕션에 적용하세요.
- service_role 키는 안전하게 Vercel 환경변수로 보관하세요.


## 프론트엔드 실행 가이드
1. `cd ongi-app` 후 필요한 패키지를 설치합니다. (`npm install`)
2. `.env.local`에 다음 환경변수를 설정합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
   - `AUTH_SECRET` (32자 이상 임의 문자열)
3. 개발 서버는 `npm run dev`로 실행합니다.
4. 관리자 권한으로 접속하려면 `admin_user` 테이블에 role이 `admin`인 계정에 대응하는 PIN을 등록하세요.

## 구현 진행 현황

### 데이터 & 인프라
- [x] Supabase 스키마, 트리거, 인덱스 SQL 정리 (`migrations/001_create_schema.sql`)
- [x] RLS 정책 초안 작성 (`migrations/002_rls_policies.sql`)
- [x] Supabase 타입 정의 생성 (`types/supabase.ts`)
- [ ] 감사 로그 테이블과 연동되는 서버 로직 구현

### 인증 & 보안
- [x] PIN 기반 로그인 및 세션(JWT 쿠키) 처리
- [x] 잘못된 PIN 3회 시 5분 잠금 로직
- [ ] 관리자 PIN/비밀번호 초기화·변경 UI

### 카운터 앱
- [x] 회사 선택 + 코드 검증 후 인원 등록 폼
- [x] 월별 필터, 요약 카드, 멀티 선택/전체선택 동작
- [x] 결제 준비/완료 모달 + 영수증 업로드 처리
- [ ] 결제 후 영수증/Signed URL 조회 화면
- [ ] 카운터 전용 감사 로그 확인 기능

### 관리자 기능
- [x] 회사 CRUD 화면 및 기본 정보 편집
- [x] 관리자 대시보드(이번 달/누적 매출 요약 + 최근 결제 목록)
- [ ] CSV 익스포트 및 상세 리포트 다운로드
- [ ] 감사 로그/활동 기록 UI

### 테스트 & 운영
- [x] `npm run lint`, `npm run build` 기본 검증
- [ ] 통합 테스트 및 RLS/권한 시나리오 수동 점검
- [ ] Supabase Storage 버킷 생성 및 권한 검증

## 다음 작업 예정
- `npm run supabase -- link --project-ref fxhfjncxyheohbboapyg` (최초 1회)로 CLI와 프로젝트 연결
- `npm run supabase -- db push --include-all` 실행해 `supabase/migrations` 전체 적용 (또는 SQL Editor에서 순서대로 실행)
- `git push origin main` (네트워크 가능 시)으로 방금 커밋 푸시
- Supabase `admin_user` 테이블에 PIN 설정된 계정 추가 후, 로그인/잠금 시나리오 직접 테스트
- 카운터 화면에서 결제 내역 Signed URL 조회, 감사 로그/CSV 등 남은 TODO 진행

