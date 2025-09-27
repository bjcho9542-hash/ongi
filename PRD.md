# PRD: 온기한식뷔페 — 회사별 장부 시스템

## 1. 개요
**목적:** 테블릿으로 회사별 후불 인원 입력 → 기간 선택 → 합계 자동 계산 → 결제 완료(영수증 첨부) → 관리자 리포트  
**스택:** Front — Next.js (TypeScript), Back/DB — Supabase (Postgres + Storage), 배포 — Vercel

## 2. 배경 및 문제
현재: 종이 수첩으로 회사별 방문 기록 및 인원 합산 → 결제 시 수기 계산 반복 → 실수·시간 소요  
목표: 입력/합산/결제 상태 표기/영수증 관리/관리자 리포트로 운영 효율 향상

## 3. 대상 사용자
- 카운터(입력·결제 담당)
- 관리자(회사 등록·리포트·CSV 추출·감사 로그 확인)

## 4. 핵심 기능 요구사항 (MVP)
- 로그인: PIN (테이블릿 전용)
- 회사 레코드: name, code(4자리), contact_name, contact_phone, password_hash(옵션), business_number(옵션), address(옵션)
- 장부 입력:
  - 상단: 연도/월 드롭다운(기본: 오늘 기준)
  - 좌측: 회사 선택(검색/드롭다운) → 회사코드 입력(4자리) → 인증 → 인원 드롭다운(1~20) 활성화 → 등록
  - 우측: 장부(한 달 기준, 2컬럼: 1~16 / 17~31; same-date 여러 행 허용)
  - 멀티선택: 기본 전체선택, 전체선택/전체해제 버튼, 개별 체크박스
  - 결제: 시작일(자동 = 마지막 결제 다음날, 비수정), 종료일(기본 오늘, 수정 가능) → 결제 팝업(요약 + 영수증 업로드 카메라/파일) → '예' 선택 시 Payment 생성 및 Entry.is_paid 업데이트 → UI에서 결제완료 스타일 적용(연한 회색 배경 + 얇은 가로 취소선) 
- 영수증: Supabase Storage private bucket에 업로드, Payment/Receipt 테이블에 경로 저장, 관리자/테이블릿에서 Signed URL로 조회
- 관리자 기능: 회사 CRUD, 결제 내역 조회(회사/기간/복수 선택), 총매출 리포트, CSV export, 감사 로그
- 보안: TLS, 비밀번호 해시(bcrypt/Argon2), 민감 데이터 AES-256 권장, service_role 키는 서버 전용

## 5. 화면 흐름(요약)
1. 로그인(PIN) → 2. 메인(회사 선택) → 3. 회사 인증 → 4. 인원 등록(장부에 추가) → 5. 멀티선택 → 6. 결제 팝업(영수증 업로드) → 7. 결제 완료 처리 → 8. 관리자 리포트 확인

## 6. 데이터 모델 요약
- company, admin_user, entry, payment, receipt, audit_log (자세한 마이그레이션 SQL 파일 참조)

## 7. Acceptance Criteria (검증 가능한 항목)
- 로그인: 올바른 PIN → 세션, 잘못된 PIN 3회 → 5분 잠금
- 회사 등록: 필수 필드 저장, 중복 코드 오류
- 장부 입력: 회사 선택→코드 인증→등록 버튼 활성화, 동일 날짜 다중 등록 가능
- 결제: 멀티선택 → 결제 팝업 → '예' 클릭 시 Payment 생성 및 Entry 업데이트, 결제 완료 UI 반영
- 영수증: 업로드 후 관리자에서 보기 가능
- 리포트/CSV: 기간별 총매출 정확(예: (3+4+8)*8000 검증)
- 권한: Counter는 입력/결제만, Admin은 전체 권한

## 8. 개발·배포 가이드(핵심)
- Next.js + TypeScript (App Router 권장)
- Supabase: Postgres + Storage(private bucket). Supabase Auth 권장.
- Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY(서버 전용) 환경변수 설정
- Server-only 작업: 영수증 Signed URL 생성, RLS 우회가 필요한 집계 등은 Next.js server function에서 처리
- 기존 `컨텍스트7 mcp` 워크플로 대체: 컨텍스트는 Supabase 테이블에 저장하고 서버에서 합성하여 LLM 호출(또는 내부 로직)으로 대체. 마이그레이션 유틸 제공 권장.
- TypeScript 주의사항(간단): env typing, null-safety, Supabase 제네릭 타입 사용, avoid window on server, use zod for API validation

## 9. 파일 목록 (이 패키지에 포함)
- PRD.md (이 파일)
- migrations/001_create_schema.sql
- migrations/002_rls_policies.sql
- types/supabase.ts
- README.md (실행/검증 가이드 & Codex CLI prompt)

## 10. 다음 단계 추천 (우선순위)
1. PRD 확정 → 2. 마이그레이션 적용(Supabase) → 3. types 생성(supabase gen types) → 4. Next.js 템플릿 + 샘플 API 작성 → 5. UI(디자인/Figma) 제작

---

# 개발/테스트 참고
- Supabase Storage 권한 설정 확인
- RLS 적용 후 반드시 권한 테스트
- service_role 키는 절대 클라이언트에 노출 금지
