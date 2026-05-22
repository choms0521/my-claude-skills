---
name: music-generator
description: "mmx music generate CLI를 사용하여 노래를 생성하는 스킬. 가사+옵션 분리 입력, 통합 작곡 양식(제목·BPM·Key·섹션별 가사+디렉션) 통째 입력, 인터뷰 기반 작곡을 모두 지원."
triggers: ["music-generator"]
argument-hint: "[가사 텍스트 또는 통합 작곡 양식] [--instrumental] [--genre <genre>] [--bpm <number>] [--key <key>] [--mood <mood>] [--vocals <text>] [--tempo <text>] [--instruments <text>] [--structure <text>] [--avoid <text>] [--references <text>] [--use-case <text>] [--extra <text>] [--out <path>]"
runtime: codex
support-level: full
generated-from: skills/music-generator
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Codex
- Invocation: `$music-generator`
- Install target: `$CODEX_HOME/skills/music-generator` (기본값: `~/.codex/skills/music-generator`)
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스킬입니다.

# Music Generator Skill

mmx music generate CLI를 래핑하여 노래를 생성합니다.
두 가지 모드를 지원합니다:

1. **Direct Mode**: 가사와 메타 정보가 함께 제공되면 즉시 mmx CLI를 호출하여 mp3를 생성
2. **Interview Mode**: 가사 없이 요청하면 단계별 질문으로 요구사항을 수집한 후 생성

---

## Pre-Check

스킬 실행 전 반드시 필수/선택 도구 설치 여부를 확인합니다:

**필수:**
```bash
which mmx
```
- 실패 시: "mmx CLI가 설치되어 있지 않습니다. 설치 후 다시 시도해주세요." 안내 후 종료
- 성공 시: 모드 분기로 진행

**선택 (참고곡 오디오 분석용):**
```bash
which yt-dlp    # YouTube MP3 다운로드 (YouTube URL 참고곡 전용)
which gemini    # Gemini CLI (오디오 직접 청취 분석, YouTube/로컬 MP3 공용)
which ffmpeg    # 오디오 디코딩 (신호 분석 + yt-dlp 오디오 추출에 필요)
which ffprobe   # 오디오 메타데이터/신호 분석 (로컬 MP3의 ID3 태그 추출 포함)
python3 -c "import numpy"  # 신호 분석 연산
```
- `yt-dlp`는 YouTube URL 참고곡일 때만 필요. 로컬 MP3 참고곡은 불필요
- `gemini` / `ffmpeg` / `ffprobe` / `numpy`는 YouTube/로컬 MP3 공통 분석에 사용
- 없어도 스킬 자체는 정상 동작 (기존 WebSearch 방식으로 fallback)

---

## Mode Selection

사용자 요청을 분석하여 모드와 입력 형식을 결정합니다:

| 조건 | 모드 | 입력 형식 |
|------|------|----------|
| 가사가 텍스트로 제공됨 + CLI 옵션으로 메타 분리 입력 | **Direct Mode** | **A. 분리형** |
| 통합 작곡 양식(제목·BPM·Key·섹션별 가사+디렉션) 텍스트가 통째로 제공됨 | **Direct Mode** | **B. 통합형** |
| `--instrumental` 플래그 또는 "배경음악", "인스트루멘탈" 자연어 키워드 | **Direct Mode (Instrumental)** | A 또는 B |
| 가사 없음 + instrumental 아님 | **Interview Mode** | — |

**입력 형식 판별:**
- 사용자가 직접 "양식으로 받아줘" / "통째로 줄게" 등의 의사를 표현하거나, 입력 텍스트 안에 `제목:`, `BPM:`, `[Verse 1]` 같은 양식 마커가 동시에 감지되면 **B. 통합형**으로 분류
- 그 외 가사만 단독 제공되고 CLI 옵션이 별도로 들어오면 **A. 분리형**
- 모호한 경우(짧은 텍스트에 일부 마커만 있는 등) 사용자에게 한 번 확인

**중요:**
- `--instrumental`과 `--lyrics-file`은 동시 사용 불가 (mmx CLI 제약)
- "배경음악 만들어줘" 같은 자연어도 Instrumental로 분류
- 통합형(B)에서도 가사 vs 디렉션 vs 메타는 mmx 호출 직전에 자동 분리되어 전송됨 (스킬 내부 처리)

---

## Direct Mode

가사와 메타 정보가 제공된 경우 즉시 mmx CLI를 호출합니다.
입력 형식에 따라 두 갈래로 처리합니다:

- **A. 분리형**: 사용자가 가사 텍스트와 CLI 옵션을 따로 제공 → 그대로 매핑 (아래 1~6번 절차)
- **B. 통합형**: 사용자가 통합 작곡 양식(제목·BPM·Key·섹션별 가사+디렉션) 텍스트 한 덩어리로 제공 → "Composition Spec Parsing" 절차로 자동 추출 후 동일한 1~6번 절차로 진행

### 1. --prompt 구성 (필수)

`--prompt`는 mmx CLI의 **필수 옵션**입니다. 항상 생성하여 전달해야 합니다.

**조합 규칙:**
- 장르 + 분위기 + 보컬 특성 + 멤버 정보(있는 경우)를 자연어 문장으로 조합
- 멤버/보컬 정보가 있으면 그룹 구성, 포지션, 특징을 자연어로 녹여냄
- **듀엣/다중 보컬 시**: "Two distinct singers alternating", "Male-female duet" 등 보컬 구분을 prompt 첫 부분에 명시적으로 강조

**예시 (솔로/그룹):**
```
--prompt "K-POP summer pop, 5-member girl group with bright female vocals, main vocalist with powerful high notes, one rapper with dynamic flow, synth-driven upbeat arrangement"
```

**예시 (듀엣):**
```
--prompt "Male-female duet K-POP song. Two distinct singers alternating verses: sweet clear female soprano voice and warm youthful male tenor voice. They sing together in chorus with harmonies."
```

### 2. 가사 전달 (보컬 곡 전용, --lyrics-file 필수)

**instrumental 모드에서는 이 단계를 건너뜁니다.**

보컬 곡의 가사는 **항상 임시 파일을 통해 --lyrics-file로 전달**합니다. `--lyrics`로 직접 전달하지 않습니다 (셸 이스케이프 위험).

**절차:**
1. `mktemp`로 예측 불가능한 임시 파일을 생성 (예: `lyrics_file="$(mktemp /tmp/mmx-lyrics-XXXXXX.txt)"`)
2. 필요 시 `chmod 600 "$lyrics_file"`로 권한을 소유자 읽기/쓰기 전용으로 제한
3. 생성한 임시 파일에 가사를 저장
4. `--lyrics-file "$lyrics_file"`로 전달
5. mmx 실행 완료 후 (성공/실패 무관) 임시 파일 삭제

### 3. CLI 옵션 매핑

사용자가 제공한 메타 정보를 mmx CLI 옵션에 매핑합니다:

| 사용자 입력 | mmx 옵션 |
|------------|----------|
| 장르 | --genre |
| 분위기/감정 | --mood |
| BPM (숫자) | --bpm |
| 빠르기 (자연어) | --tempo |
| Key | --key |
| 보컬 스타일 | --vocals |
| 악기 구성 | --instruments |
| 곡 구조 | --structure |
| 피해야 할 요소 | --avoid |
| 참고곡/아티스트 (텍스트 설명만) | --references |
| 사용 목적 | --use-case |
| 추가 요청 | --extra |
| 스타일 설명 (필수) | --prompt |
| 출력 파일 | --out |

### 4. 파일명 생성 규칙

`--out` 옵션의 파일명은 다음 규칙으로 자동 생성합니다:

- 곡 제목에서 파일명 생성
- 공백 → 하이픈(`-`)
- ASCII 특수문자(따옴표, 슬래시, 콜론, 물음표 등) → 제거
- 한국어/일본어 문자 및 CJK 구두점(・, 、 등) → 허용 (파일시스템 지원)
- 영문은 소문자로 변환
- 길이 상한: 80자
- 확장자: `.mp3`
- 경로: `~/Music` (기본 출력 디렉토리)
- 파일 충돌: 동일 파일명이 존재하면 `-2`, `-3` suffix 부여 (예: `summer-diary-2.mp3`)

**BPM/Tempo 우선순위:** `--bpm`(숫자)이 `--tempo`(자연어)보다 우선합니다. 둘 다 제공 시 `--bpm`만 사용하고 `--tempo`는 생략합니다.

**예시:**
- "Summer Diary" → `~/Music/summer-diary.mp3`
- "여름빛 다이어리" → `~/Music/여름빛-다이어리.mp3`
- "ナツイロ・ダイアリー" → `~/Music/ナツイロ・ダイアリー.mp3`

### 5. CLI 조립 예시

**가사 파일과 보컬 디렉션 분리 규칙 (중요):**
- **가사 파일(`--lyrics-file`)에는 구조 태그(`[Verse 1]`, `[Chorus]` 등)와 순수 가사만 포함**
- `(vocal direction)` 형식의 보컬 지시사항을 가사 파일에 넣으면 **mmx가 해당 텍스트를 가사로 인식하여 그대로 노래로 부름** (버그 아님, 사양)
- 보컬 표현/감정 변화/섹션별 보컬 흐름은 모두 **`--prompt`에 자연어로 통합**하여 전달
- `--prompt`에서 섹션별 보컬 변화를 시간 순서대로 구체적으로 기술 (예: "Verse는 속삭이듯 시작하여, Pre-Chorus에서 감정이 고조되고, Chorus에서 파워풀한 벨팅으로 폭발")

**예시 1: 여성 솔로 - 이별 발라드**
```bash
# 1. 안전한 임시 파일 생성 + cleanup 보장
lyrics_file="$(mktemp /tmp/mmx-lyrics-XXXXXX.txt)"
chmod 600 "$lyrics_file"
trap 'rm -f "$lyrics_file"' EXIT INT TERM

# 2. 가사를 임시 파일에 저장 (구조 태그 + 순수 가사만)
cat > "$lyrics_file" << 'LYRICS_EOF'
[Intro]
Mm... mm...

[Verse 1]
텅 빈 방 안에 너의 향기만 남아
창밖에 비가 내리네 우리처럼

[Pre-Chorus]
돌아올 수 없는 걸 알면서도
자꾸만 너를 부르게 돼

[Chorus]
비가 내리면 생각나 너의 미소가
지울 수 없는 기억들이 나를 적셔
LYRICS_EOF

# 3. mmx CLI 호출 (보컬 디렉션은 --prompt에 통합)
mmx music generate \
  --prompt "Emotional K-POP ballad with clear, crystalline female vocals. Intro: soft humming, barely audible, like whispering to oneself. Verse: gentle and restrained, suppressing emotions with breathy tone. Pre-Chorus: gradually building emotion, voice trembling slightly. Chorus: powerful belt with raw emotion, tears in voice, full chest voice erupting. Piano-driven arrangement with strings swelling in chorus. The vocal journey goes from whispered restraint to full emotional release." \
  --lyrics-file "$lyrics_file" \
  --vocals "clear bright female soprano, emotional range from soft whisper to powerful belt" \
  --genre "K-POP Ballad" \
  --mood "melancholic, heartbreaking, nostalgic" \
  --bpm 72 \
  --key "A minor" \
  --instruments "piano, strings, soft drums, cello" \
  --structure "intro-verse-prechorus-chorus-verse-prechorus-chorus-bridge-chorus-outro" \
  --out ~/Music/비가-내리면.mp3
```

**예시 2: 남녀 듀엣 - 로맨틱**
```bash
lyrics_file="$(mktemp /tmp/mmx-lyrics-XXXXXX.txt)"
chmod 600 "$lyrics_file"
trap 'rm -f "$lyrics_file"' EXIT INT TERM

cat > "$lyrics_file" << 'LYRICS_EOF'
[Verse 1][Female]
오늘따라 하늘이 예뻐서
너에게 전화를 걸었어

[Verse 2][Male]
네 목소리만 들으면 괜찮아져
세상이 다 환해지는 것 같아

[Chorus][Both]
너와 나 이 순간이 영원하길
손잡고 걸어가는 이 길 위에서
LYRICS_EOF

mmx music generate \
  --prompt "Romantic K-POP duet. Verse 1 (Female): sweet and playful, light staccato delivery with smiling voice. Verse 2 (Male): warm and gentle, soft low register, tender tone. Chorus (Both): joyful harmony, female takes melody while male supports with warm lower harmony. Bright acoustic arrangement with playful energy. Vocal chemistry should feel natural and intimate." \
  --lyrics-file "$lyrics_file" \
  --vocals "duet with harmonies, alternating sweet female soprano and warm male tenor, harmonizing in chorus" \
  --genre "K-POP Acoustic Pop" \
  --mood "romantic, warm, happy" \
  --bpm 110 \
  --key "G major" \
  --instruments "acoustic guitar, piano, light percussion, bass" \
  --extra "Must have two distinct vocal timbres, clear alternation between singers" \
  --out ~/Music/너와-나.mp3
```

**예시 3: Instrumental**
```bash
mmx music generate \
  --prompt "Lo-fi hip hop study beats, warm and relaxing atmosphere" \
  --instrumental \
  --genre "Lo-fi Hip Hop" \
  --mood "calm, relaxing" \
  --tempo "slow" \
  --instruments "piano, vinyl crackle, soft drums" \
  --out ~/Music/study-beats.mp3
```

### 6. 실행 및 결과 안내

- CLI 명령어를 사용자에게 보여준 뒤 실행
- 성공 시: 파일 경로 안내, 재생 방법 제안
- 실패 시: Error Handling 섹션 참조

### 7. Composition Spec Parsing (B. 통합형 전용)

사용자가 통합 작곡 양식 텍스트를 통째로 제공하면, 위 1~6번 절차에 진입하기 전에 다음 파싱을 먼저 수행합니다. 양식 표준은 "Composition Spec Format" 섹션을 참조하옵니다.

**파싱 절차:**

1. **메타 헤더 추출** — 양식 상단의 `제목:`, `BPM:`, `Key:`, `보컬 톤:`, `장르:`, `분위기:`, `악기:`, `참고곡:`, `피해야 할 요소:`, `구조:`, `사용 목적:`, `추가 요청:` 등 키워드 라인을 키-값 쌍으로 추출
   - 키 이름은 한국어/영어 양쪽 허용 (`Title:` ↔ `제목:`, `Mood:` ↔ `분위기:` 등)
   - 줄당 한 항목 원칙. 콜론(`:`) 또는 한글 콜론(`：`)을 구분자로 인정
2. **섹션 본문 분리** — `[Intro]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Final Chorus]`, `[Outro]` 등 대괄호 태그로 시작하는 블록을 순서대로 추출. 듀엣/그룹 파트 태그(`[Verse 1][Female]`, `[Chorus][Both]` 등)는 함께 보존
3. **가사 vs 디렉션 분리** — 각 섹션 블록에서
   - `디렉션:` 또는 `Direction:` 또는 `(...)` 괄호 안 텍스트로 시작하는 줄 → **디렉션 버킷**
   - `💡`, `보컬 가이드`, `전체 팁` 등으로 시작하는 블록 → **전체 디렉션 버킷**
   - 그 외 한국어/영어/일본어 문장 줄 → **가사 버킷** (구조 태그 라인은 가사 버킷 머리에 보존)
   - 타임코드(`0:00 ~ 0:08`)는 가사 버킷에서 제거하고, 디렉션 버킷의 섹션 머리말에 자연어로 변환하여 보존 (예: "Intro는 약 8초 길이로 진행")
4. **mmx 옵션 매핑**
   - 메타 헤더 → 1~3번 절차의 CLI 옵션에 매핑 (장군님 결정 A-3에 따라, `Key:`가 `C Major → D Major` 같은 화살표 표기면 시작 키만 `--key`로 보내고 전조 지시는 `--extra`/`--prompt` 자연어로 보냄)
   - 섹션별 디렉션 + 전체 디렉션 → 시간순으로 합쳐 `--prompt` 본문에 통합 (장군님 결정 B에 따라, 타임코드는 자연어로 풀어 표현)
   - 가사 버킷 → `--lyrics-file` 임시 파일에 기록 (구조 태그 + 순수 가사만)
5. **플래그 vs 텍스트 충돌 처리 (장군님 결정 C-2)** — 통합형 텍스트 안 메타와 별도 CLI 플래그(예: `--bpm 120`)가 함께 들어왔고 값이 다르면, 처리를 일시 중단하고 사용자에게 한 번 묻고 확정값을 받음
   - 충돌 확인 예시: "BPM이 양식에는 118로, 플래그에는 120으로 적혀있사옵니다. 어느 쪽을 사용할까요?"
   - 충돌이 없거나 한쪽에만 있으면 그대로 사용
6. **누락 정보 처리 (장군님 결정 E-2)** — 통합형 텍스트에 BPM/Key 등 필수에 가까운 메타가 빠지면, AI가 양식 안의 디렉션·장르·분위기 묘사로부터 추론하여 채우고, 사용자에게 어떤 항목을 추론으로 채웠는지 알림만 표시 (재질의는 하지 않음)
   - 예: "BPM이 적혀있지 않아 디렉션의 '밝고 경쾌한 댄스 팝' 묘사로부터 118로 추론하여 채웠사옵니다."
7. **파싱 산출물 미리보기** — 1~6번 절차로 진입하기 전에, 파싱된 결과(메타 표 + 섹션별 가사/디렉션 분리 결과)를 사용자에게 한 번 보여주고 확인을 받음. 잘못 분리된 항목이 있으면 사용자 지시로 바로잡음 (최대 3회 재파싱 허용)

**파싱 산출물 미리보기 예시:**

```
📋 통합 양식 파싱 결과

[메타]
- 제목: 두근 (Heartbeat)
- 시작 Key: C Major (Final Chorus에서 D Major로 ½ key up)
- BPM: 118
- 보컬 톤: 산뜻하고 청량한 미성, 후반부 에너지 ↑

[가사 (--lyrics-file로 전송)]
[Intro]
Oh, na-na-na, oh, na-na-na
La-la, la-la, my heartbeat

[Verse 1]
처음 봤을 때부터
...

[디렉션 (--prompt로 통합)]
Intro (약 8초): 브리시 발성, 마이크와 가까운 거리감, 음정 정확히 잡되 힘은 30% ...
Verse 1 (약 16초): 가볍게 톡톡 던지듯(staccato), "맴돌아"는 끝을 살짝 굴려서 ...
Pre-Chorus: 점진적 빌드업, "숨이 멎을 듯한"에서 호흡을 짧게 끊어 ...
Chorus: 풀파워 90% 밝게 트인 발성, "BGM"은 짧게 끊기 ...
...
Final Chorus: D Major로 키 업 ½, 풀파워 100%, 음정 안정성 최우선 ...

[전체 보컬 가이드 (--prompt 말미에 추가)]
- 공기 반 소리 반의 청량한 톤
- 자음(ㅈ, ㅊ, ㅎ)을 또렷하게
- Verse → Pre-Chorus → Chorus로 70% → 85% → 95% 단계적 에너지

이 분리 결과로 mmx에 전송할까요?
[확인] [수정 요청]
```

---

## Composition Spec Format

Stage 4 작곡 산출물과 Direct Mode 통합형 입력이 공유하는 표준 양식입니다. 인터뷰에서 수집한 모든 정보가 누락 없이 담겨야 하며, 사용자가 직접 작성할 때도 이 양식을 따르면 자동 파싱이 보장됩니다.

**전체 골격:**

```
🎵 곡 정보
제목: <곡 제목>
장르: <--genre 값>
분위기: <--mood 값>
BPM: <숫자, 또는 자연어 빠르기>
Key: <단일 키 또는 "C Major → D Major (Final Chorus에서 ½ key up)" 형식>
보컬 톤: <--vocals 자연어 설명>
악기: <--instruments 콤마 구분>
구조: <--structure, 생략 가능>
사용 목적: <--use-case, 생략 가능>
참고곡: <--references, 생략 가능>
피해야 할 요소: <--avoid, 생략 가능>
추가 요청: <--extra, 생략 가능>

🎤 가사 & 구간별 디렉션
[Intro] (약 N초)
<가사 줄>
디렉션: <섹션별 보컬/편곡 디렉션>

[Verse 1] (약 N초)
<가사 줄>
디렉션: <...>

[Pre-Chorus] (약 N초)
...

[Chorus] (약 N초)
...

[Verse 2] / [Bridge] / [Final Chorus] / [Outro]
...

💡 전체적인 보컬 가이드 팁
- <팁 1>
- <팁 2>
- <팁 3>
```

**필수 항목과 선택 항목:**

| 헤더 | 필수 여부 | mmx 매핑 |
|------|---------|---------|
| 제목 | 필수 | `--out` 파일명 |
| 장르 | 필수 | `--genre` |
| 분위기 | 필수 | `--mood` |
| BPM | 권장 (없으면 추론) | `--bpm` 또는 `--tempo` |
| Key | 선택 | `--key` (전조는 `--extra`/`--prompt`) |
| 보컬 톤 | 보컬 곡 필수 | `--vocals` |
| 악기 | 권장 | `--instruments` |
| 구조 | 선택 | `--structure` |
| 사용 목적 | 선택 | `--use-case` |
| 참고곡 | 선택 | `--references` |
| 피해야 할 요소 | 선택 | `--avoid` |
| 추가 요청 | 선택 | `--extra` |
| 섹션별 가사 | 보컬 곡 필수 | `--lyrics-file` |
| 섹션별 디렉션 | 권장 | `--prompt` 본문 |
| 전체 보컬 가이드 팁 | 선택 | `--prompt` 말미 |

**케이스별 양식 변형:**

- **인스트루멘탈** (장군님 결정 A-1): "🎤 가사 & 구간별 디렉션" 헤더를 "🎚 구간별 편곡 디렉션"으로 교체하고, 섹션마다 가사 없이 악기/분위기 변화만 기술. "보컬 톤" 메타 행 생략
- **듀엣/그룹** (장군님 결정 A-2): 섹션 라벨에 보컬 파트 태그 병기 — `[Verse 1][Female]`, `[Verse 2][Male]`, `[Chorus][Both]`. 디렉션도 파트별로 분리하여 기술
- **곡 중간 전조** (장군님 결정 A-3): `Key:` 헤더에 화살표 표기 (`C Major → D Major (Final Chorus에서 ½ key up)`). 파싱 시 시작 키만 `--key`로, 전조 지시는 `--extra`/`--prompt`로 분리
- **타임코드** (장군님 결정 B): 자연어로 표기 (`(약 8초)`, `(약 16초)`). `mm:ss` 숫자 형식도 허용하되 파싱 시 자연어로 변환되어 `--prompt`에 들어감

---

## Interview Mode

가사 없이 "노래 만들어줘"라고 요청한 경우, 단계별 질문으로 요구사항을 수집합니다.

### Stage 0: Instrumental 확인

첫 번째 질문으로 인스트루멘탈 여부를 확인합니다.

**질문:** "인스트루멘탈(반주만)로 만드시겠습니까, 보컬이 있는 노래로 만드시겠습니까?"

**선택지:**
- 인스트루멘탈 (반주만) → `--instrumental` 플래그 설정, vocals 질문 건너뛰기, 가사 생성 생략
- 보컬 있는 노래 → 다음 단계로 진행

### Stage 1: 모드 선택 (Expert / Easy)

**질문:** "음악 설정을 어떻게 진행할까요?"

**선택지:**
- **Easy 모드** (초보자 친화): 직관적 질문 최대 8개 (instrumental은 4개, 보컬 곡은 Q3a/Q3b 분리 포함 최대 8개), 힌트 풍부, 전문 용어 최소화
- **Expert 모드** (상세 설정): BPM, Key 등 전문적 옵션 최대 12개 직접 입력 (Q4a/Q4b 분리 포함)

### Stage 2: 단계별 질문

각 질문은 **반드시 하나씩** 대화형 질문으로 물어봅니다.
모든 질문에 "건너뛰기(skip)" 옵션을 포함합니다.
skip 시 AI가 다른 답변들을 종합하여 최적의 값을 자동 추론합니다.
추론이 불가능하면 해당 CLI 옵션을 생략합니다 (mmx 기본값 사용).

#### Easy 모드 질문 (최대 9개, instrumental은 4개)

**Q1. 사용 목적**
- 질문: "이 노래는 어떤 용도로 사용하시나요?"
- 힌트: 타이틀곡, 유튜브/숏폼 배경음악, 게임 OST, 카페 음악, 운동 음악, 앨범 수록곡, 그냥 재미로
- CLI: `--use-case`
- skip 기본값: 생략
- **설계 의도:** 용도에 따라 이후 장르/분위기/길이 추론의 맥락이 달라지므로 가장 먼저 질문

**Q2. 느낌 (장르 + 분위기 통합)**
- 질문: "어떤 느낌의 노래를 만들고 싶으세요? 장르나 분위기를 자유롭게 설명해 주세요!"
- 힌트: "여름에 듣기 좋은 신나는 댄스곡", "비 오는 날 듣는 잔잔한 발라드", "새벽 감성 힙합", "카페에서 나올 법한 재즈"
- CLI: `--genre` + `--mood` (AI가 응답에서 장르와 분위기를 자동 분리)
- skip 기본값: genre="pop", mood는 use-case에서 추론
- **설계 의도:** 초보자는 장르와 분위기를 분리해서 생각하지 않음. 자연어로 한 번에 받아서 AI가 분리하는 것이 직관적. 빠르기(tempo)도 분위기에서 자동 추론 (신나는 → fast, 잔잔한 → slow)

**Q3a. 보컬 타입** *(instrumental이면 건너뛰기)*
- 질문: "어떤 타입의 보컬을 원하시나요?"
- 선택지:
  - 여성 솔로
  - 남성 솔로
  - 남녀 듀엣
  - 걸그룹
  - 보이그룹
  - 혼성 그룹
- skip 기본값: "여성 솔로"

**Q3b. 보컬 스타일** *(Q3a 답변에 따라 선택지가 달라짐)*
- 질문: "어떤 스타일의 목소리를 원하시나요?"
- **Q3a 답변별 선택지:**

  **여성 솔로:**
  - 맑고 청량한 (clear, bright soprano — 투명한 고음, 시원한 느낌)
  - 숨소리 섞인 몽환적인 (breathy, ethereal — 속삭이듯 신비로운 분위기)
  - 파워풀 벨팅 (powerful belt — 강렬한 가창력, 가슴을 울리는 고음)
  - 허스키하고 스모키한 (husky, smoky — 깊고 거친 음색, 블루스/록)
  - 부드럽고 실크같은 (silky, smooth R&B — 매끈한 소울풀 음색)
  - 따뜻하고 감성적인 (warm, mellow — 포근한 어쿠스틱 감성)
  - 쿨하고 초연한 (detached, cool — 감정을 절제한 모던한 톤)
  - 절박하고 날것의 (desperate, raw — 감정이 터져나오는 강렬함)

  **남성 솔로:**
  - 깊은 바리톤 (deep baritone — 낮고 울림 있는 남성적 음색)
  - 따뜻한 테너 (warm tenor — 부드럽고 감미로운 발라드 톤)
  - 거칠고 허스키한 (raspy, gritty — 록/블루스의 거친 감정)
  - 실크같은 R&B (silky smooth — 매끈한 소울풀 팔세토)
  - 파워풀 벨팅 (powerful belt — 강렬한 고음 폭발)
  - 숨소리 섞인 친밀한 (breathy, intimate — 속삭이듯 가까운)
  - 여유로운 레이드백 (laid-back — 힘을 뺀 자연스러운 힙합/레게)
  - 멜로딕 랩 (melodic rap — 노래와 랩을 오가는 스타일)

  **남녀 듀엣:**
  - 로맨틱 하모니 (breathy female + warm male — 달콤한 발라드)
  - 파워풀 듀엣 (belt female + belt male — 강렬한 감정 폭발)
  - 콜앤리스폰스 (call & response — 주고받는 대화형 구조)
  - 대비형 (ethereal female + deep spoken male — 극적 대비)

  **걸그룹:**
  - 밝고 상큼한 (cute, bright — 청량한 유니즌 하모니)
  - 걸크러시/파워풀 (girl crush — 강렬하고 카리스마)
  - 우아하고 몽환적인 (elegant, dreamy — 에테리얼한 레이어드 하모니)
  - 당당하고 쌈마이 (sassy, confident — 자신감 넘치는 attitude)
  - 파워 보컬 중심 (powerful vocal — 성량 있는 메인보컬 + 하모니)

  **보이그룹:**
  - 파워풀 퍼포먼스 (energetic, powerful — 강렬한 군무 스타일)
  - 소년미/청량한 (bright, youthful — 맑고 상큼한 하모니)
  - 랩+보컬 하이브리드 (rap-vocal hybrid — K-POP 전형 구조)
  - 팔세토 하모니 (falsetto layering — 몽환적이고 부드러운)
  - 허스키/거친 에너지 (husky, rough — 강렬한 감정의 록 느낌)

  **혼성 그룹:**
  - AI가 느낌(Q2)에 맞춰 적절한 스타일을 자동 추론

- CLI: `--vocals` (Q3a + Q3b를 조합하여 영어 vocals 설명 생성. 괄호 안의 영어 키워드를 활용)
- skip 기본값: Q3a 타입의 첫 번째 스타일. 단, `혼성 그룹`은 예외로 항상 AI가 느낌(Q2)에 맞춰 적절한 스타일을 자동 추론

**Q4. 노래 언어** *(instrumental이면 건너뛰기)*
- 질문: "가사는 어떤 언어로 만들까요?"
- 힌트: 한국어, 영어, 일본어, 한국어+영어 믹스, 일본어+영어 믹스
- CLI: 가사 생성(Stage 4) 시 언어 지시로 사용
- skip 기본값: genre에서 추론 (K-POP → 한국어+영어, J-POP → 일본어+영어, Pop/R&B → 영어)

**Q5. 테마/주제** *(instrumental이면 건너뛰기)*
- 질문: "노래의 주제나 이야기는 어떤 건가요?"
- **선택지: 고정 목록이 아닌, 앞선 답변(Q1 용도 + Q2 느낌 + Q3a/Q3b 보컬)을 종합하여 AI가 동적으로 4개의 맞춤 선택지를 생성**
- 동적 생성 규칙:
  - Q2에서 슬픈/감성적 느낌 → 이별/그리움, 외로움, 추억, 후회 등 감성적 테마 위주
  - Q2에서 밝고 신나는 느낌 → 여름/여행, 사랑/설렘, 파티/자유, 새로운 시작 등
  - Q2에서 잔잔한/차분한 느낌 → 일상의 소중함, 자기 위로, 그리운 사람, 밤하늘 등
  - Q3a에서 듀엣 선택 → 사랑/로맨스 관련 테마 비중 높임
  - Q1 용도가 게임 OST → 모험, 전투, 평화로운 마을 등 게임 맥락 테마
  - Q1 용도가 운동 음악 → 도전, 승리, 한계 돌파 등 동기부여 테마
- CLI: 가사 생성(Stage 4) 시 주제 지시로 사용. `--prompt`에도 반영
- skip 기본값: 앞선 답변에서 AI가 가장 적합한 테마를 자동 추론

**Q6. 가사 밀도/길이** *(instrumental이면 건너뛰기)*
- 질문: "가사를 어떻게 만들까요?"
- 선택지:
  1) **짧고 깔끔하게** — 각 섹션을 짧게(2-4줄), 후렴 위주 반복형 (2분 곡에 적합)
  2) **보통** — 각 섹션 4-6줄, 표준 K-POP 길이 (3분 곡에 적합)
  3) **풍성하게** — 서사가 복잡하거나 가사 비중이 큰 곡 (3분 30초 이상)
- CLI: Stage 4 가사 생성 시 줄 수와 반복 정도를 결정
- skip 기본값: "보통"

**Q7. 참고곡 + 추가 요청**
- 질문: "참고할 곡/아티스트가 있거나, 추가로 원하는 게 있으면 자유롭게 말씀해 주세요!"
- 힌트: "BTS - Dynamite 같은 느낌", "요아소비 스타일", "2분 정도 길이로", "기타 소리 많이"
- **YouTube 링크 선택지**: Pre-Check에서 `which yt-dlp` 성공 시, 대화형 질문 선택지에 "YouTube 링크로 참고곡 분석" 옵션을 추가. 사용자가 이 옵션을 선택하면 YouTube URL 입력을 받아 **Audio Analysis (YouTube)** 절차를 실행. 분석 레이어는 설치된 도구에 따라 자동 선택 (gemini 있으면 청취 분석 추가, ffmpeg/numpy 있으면 신호 분석 추가)
- **로컬 오디오 파일 선택지**: 대화형 질문 선택지에 "로컬 오디오 파일(MP3)로 참고곡 분석" 옵션을 추가. 사용자가 이 옵션을 선택하면 로컬 MP3 파일의 절대경로 또는 `~`로 시작하는 홈 경로를 입력받아 **Audio Analysis (Local MP3)** 절차를 실행. yt-dlp 없이도 동작하며, gemini/ffmpeg/numpy 가용 여부에 따라 분석 레이어가 자동 선택됨
- CLI: `--references` + `--extra` (AI가 참고곡과 추가 요청을 자동 분리)
- skip 기본값: 생략
- **참고곡 감지 시**: 답변에서 곡명/아티스트 패턴이 감지되면 **Reference Song Analysis** 절차를 실행하여 검색 결과를 수집하고, 사용자가 skip한 항목(장르, BPM, 분위기 등)을 자동으로 채움 (상세는 "Reference Song Analysis" 섹션 참조)
- **YouTube URL 감지 시**: 답변에서 YouTube URL 패턴이 감지되면 자동으로 **Audio Analysis (YouTube)** 절차를 실행
- **로컬 MP3 경로 감지 시**: 답변에서 `.mp3`로 끝나는 파일 경로(절대경로, `~/...`, 또는 따옴표로 둘러싼 경로) 패턴이 감지되면 자동으로 **Audio Analysis (Local MP3)** 절차를 실행

**Easy 모드 미수집 옵션 처리:**
- `--instruments`: `--genre`와 `--mood`에서 AI가 자동 추론하여 `--prompt`에 녹임
- `--structure`: 생략 (mmx 기본 구조 사용)
- `--bpm`: 분위기에서 AI가 자동 추론하여 생략 또는 `--prompt`에 녹임
- `--tempo`: 분위기에서 AI가 자동 추론 (신나는 → fast, 잔잔한 → slow)

#### Expert 모드 질문 (최대 13개, Q4a/Q4b 분리 포함)

**Q1. 장르**
- 질문: "장르를 지정해 주세요."
- 힌트: K-POP, J-POP, Synth Pop, Lo-fi Hip Hop, Future Bass, City Pop, R&B, Rock, Jazz, Classical
- CLI: `--genre`
- skip 기본값: "pop"

**Q2. BPM**
- 질문: "BPM을 지정해 주세요. (숫자 입력)"
- 힌트: 60-80 (발라드), 90-110 (R&B/힙합), 120-140 (팝/댄스), 140+ (EDM/드럼앤베이스)
- CLI: `--bpm`
- skip 기본값: genre/tempo에서 추론

**Q3. Key**
- 질문: "Key를 지정해 주세요."
- 힌트: C major, G major, A minor, D major, E minor, F major, B flat major
- CLI: `--key`
- skip 기본값: 생략 (mmx 자동 결정)

**Q4a. 보컬 타입** *(instrumental이면 건너뛰기)*
- 질문: "어떤 타입의 보컬을 원하시나요?"
- 선택지: 여성 솔로, 남성 솔로, 남녀 듀엣, 걸그룹, 보이그룹, 혼성 그룹
- skip 기본값: "여성 솔로"

**Q4b. 보컬 스타일** *(Q4a 답변에 따라 선택지가 달라짐)*
- 질문: "보컬 스타일을 선택하거나 직접 설명해 주세요."
- 선택지: Easy 모드 Q3b와 동일한 타입별 선택지 + "직접 입력" 옵션
- 직접 입력 예시: "warm female soprano with vibrato", "raspy male baritone with vocal fry", "breathy falsetto with reverb"
- CLI: `--vocals`
- skip 기본값: Q4a 타입의 첫 번째 스타일. 단, `혼성 그룹`은 예외로 항상 AI가 느낌에 맞춰 자동 추론

**Q5. 악기 구성**
- 질문: "사용할 악기를 지정해 주세요."
- 힌트: acoustic guitar, electric guitar, piano, synth, bass, drums, strings, brass, violin, flute
- CLI: `--instruments`
- skip 기본값: genre에서 추론

**Q6. 곡 구조**
- 질문: "곡의 구조를 지정해 주세요."
- 힌트: verse-chorus-verse-chorus, verse-prechorus-chorus-verse-prechorus-chorus-bridge-chorus, intro-verse-chorus-rap-bridge-chorus-outro
- CLI: `--structure`
- skip 기본값: 생략 (mmx 기본 구조)

**Q7. 노래 언어** *(instrumental이면 건너뛰기)*
- 질문: "가사는 어떤 언어로 작성할까요?"
- 힌트: 한국어, 영어, 일본어, 한국어+영어 믹스, 일본어+영어 믹스
- CLI: 가사 생성(Stage 4) 시 언어 지시로 사용
- skip 기본값: genre에서 추론 (K-POP → 한국어+영어, J-POP → 일본어+영어, Pop/R&B → 영어)

**Q8. 테마/주제** *(instrumental이면 건너뛰기)*
- 질문: "노래의 주제나 이야기를 알려주세요."
- **선택지: Easy 모드 Q5와 동일한 동적 생성 규칙 적용 + "직접 입력" 옵션**
- CLI: 가사 생성(Stage 4) 시 주제 지시로 사용. `--prompt`에도 반영
- skip 기본값: 앞선 답변에서 AI가 가장 적합한 테마를 자동 추론

**Q9. 가사 밀도/길이** *(instrumental이면 건너뛰기)*
- 질문: "가사를 어떻게 만들까요?"
- 선택지:
  1) **짧고 깔끔하게** — 각 섹션 2-4줄, 후렴 위주 반복형 (2분 곡에 적합)
  2) **보통** — 각 섹션 4-6줄, 표준 K-POP 길이 (3분 곡에 적합)
  3) **풍성하게** — 각 섹션 6-8줄, 서사 비중이 큰 곡 (3분 30초 이상)
- CLI: Stage 4 가사 생성 시 줄 수와 반복 정도를 결정
- skip 기본값: "보통"

**Q10. 피해야 할 요소**
- 질문: "피하고 싶은 음악적 요소가 있나요?"
- 힌트: heavy bass, autotune, distortion, electronic sounds, rap section
- CLI: `--avoid`
- skip 기본값: 생략

**Q11. 참고곡/아티스트 + 추가 요청**
- 질문: "참고할 곡/아티스트가 있거나, 추가로 원하는 게 있으면 알려주세요."
- 힌트: 자유 입력
- **YouTube 링크 선택지**: Pre-Check에서 `which yt-dlp` 성공 시, 대화형 질문 선택지에 "YouTube 링크로 참고곡 분석" 옵션을 추가. 사용자가 이 옵션을 선택하면 YouTube URL 입력을 받아 **Audio Analysis (YouTube)** 절차를 실행. 분석 레이어는 설치된 도구에 따라 자동 선택 (gemini 있으면 청취 분석 추가, ffmpeg/numpy 있으면 신호 분석 추가)
- **로컬 오디오 파일 선택지**: 대화형 질문 선택지에 "로컬 오디오 파일(MP3)로 참고곡 분석" 옵션을 추가. 사용자가 이 옵션을 선택하면 로컬 MP3 파일의 절대경로 또는 `~`로 시작하는 홈 경로를 입력받아 **Audio Analysis (Local MP3)** 절차를 실행. yt-dlp 없이도 동작하며, gemini/ffmpeg/numpy 가용 여부에 따라 분석 레이어가 자동 선택됨
- CLI: `--references` + `--extra` (AI가 참고곡과 추가 요청을 자동 분리)
- skip 기본값: 생략
- **참고곡 감지 시**: 답변에서 곡명/아티스트 패턴이 감지되면 **Reference Song Analysis** 절차를 실행하여 검색 결과를 수집하고, 사용자가 skip한 항목(장르, BPM, Key, 분위기, 악기 등)을 자동으로 채움 (상세는 "Reference Song Analysis" 섹션 참조)
- **YouTube URL 감지 시**: 답변에서 YouTube URL 패턴이 감지되면 자동으로 **Audio Analysis (YouTube)** 절차를 실행
- **로컬 MP3 경로 감지 시**: 답변에서 `.mp3`로 끝나는 파일 경로(절대경로, `~/...`, 또는 따옴표로 둘러싼 경로) 패턴이 감지되면 자동으로 **Audio Analysis (Local MP3)** 절차를 실행

### Stage 3: 노래 프리뷰 (Song Preview)

모든 질문 완료 후, AI가 수집된 정보를 종합하여 **"이런 노래를 만들겠습니다"라는 자연어 프리뷰**를 작성하여 보여줍니다.
사용자가 결과물을 미리 상상할 수 있도록 구체적이고 감성적으로 묘사합니다.

**프리뷰 구성 규칙:**
- 테마/주제 → 장르/분위기 → 보컬 → 악기/편곡 → 길이/용도 순서로 자연스럽게 연결
- AI가 자동 추론한 항목(빠르기, 악기, BPM 등)도 프리뷰에 포함하여 사용자가 검증 가능
- 사용자가 skip한 항목은 AI 추론 결과를 명시 (예: "분위기에 맞춰 BPM 125로 설정합니다")
- **참고곡 분석이 수행된 경우**: 프리뷰 상단에 분석 요약을 표시하고, 검색 결과로 채워진 항목에 출처를 명시 (상세 형식은 "Reference Song Analysis" 섹션 참조)

**프리뷰 예시 (보컬 곡):**
```
🎵 노래 프리뷰

"여름 바다 여행"을 테마로 한 Summer Pop 장르의 밝고 신나는 노래입니다.
맑고 청량한 여성 보컬이 한국어+영어 믹스 가사를 부르며,
신스, 어쿠스틱 기타, 드럼이 경쾌한 반주를 만듭니다.
BPM 125의 빠른 템포로, 약 2분 길이의 유튜브 브이로그 배경음악에
어울리는 곡입니다.

이대로 진행할까요?
[확인] [수정 요청]
```

**프리뷰 예시 (Instrumental):**
```
🎵 노래 프리뷰

비 오는 날 카페에서 흘러나올 법한 Lo-fi Hip Hop 인스트루멘탈입니다.
피아노와 바이닐 크래클 사운드가 따뜻한 분위기를 만들고,
부드러운 드럼 비트가 느긋하게 흘러갑니다.
BPM 85의 느린 템포로, 공부나 작업할 때 배경음악으로 좋습니다.

이대로 진행할까요?
[확인] [수정 요청]
```

**수정 요청 처리:**
- 사용자가 자유 텍스트로 수정 요청 (예: "보컬을 좀 더 허스키하게", "기타 대신 피아노로", "좀 더 느리게")
- AI가 해당 파라미터를 반영하여 프리뷰를 다시 생성
- 수정은 **최대 3회**까지 허용
- 3회 초과 시 현재 버전으로 진행

**상세 설정 보기 (Expert 사용자용):**
프리뷰 하단에 접힌 상태로 파라미터 상세를 첨부합니다:
```
<details>
<summary>상세 설정 보기</summary>

- 장르(--genre): Summer Pop
- 분위기(--mood): bright, upbeat, summer
- 빠르기(--tempo): fast
- 보컬(--vocals): clear bright female vocals
- 악기(--instruments): synth, acoustic guitar, drums
- 사용 목적(--use-case): 유튜브 브이로그 배경음악
- 참고(--references): -
- 추가(--extra): 2분 길이
- 테마: 여름 바다 여행
- 가사 언어: 한국어+영어 믹스
</details>
```

**프리뷰 확인 후 곡 제목 질문:**
- "곡의 제목을 정해주세요! (건너뛰면 장르+타임스탬프로 자동 생성합니다)"
- 제목은 파일명 생성에 사용 (Direct Mode 파일명 규칙 적용)
- skip 시: `{genre}-{timestamp}.mp3` 형식으로 자동 생성

### Stage 4: 작곡 (Composition Spec 산출)

Stage 3 자연어 프리뷰 확인 후, Claude가 인터뷰 결과 전부를 종합하여 **통합 작곡 양식**을 산출합니다. 양식 표준은 위 "Composition Spec Format" 섹션을 따르며, Stage 5에서 자동으로 mmx CLI 호출 형태(가사 / 디렉션 / 옵션)로 분리되어 전송됩니다.

**Instrumental 처리:** instrumental 모드에서도 Stage 4는 실행되며, "🎤 가사 & 구간별 디렉션" 헤더를 "🎚 구간별 편곡 디렉션"으로 교체하고 가사 줄 없이 섹션별 악기/분위기 변화만 기술합니다 (장군님 결정 A-1).

**산출 원칙:**
- 인터뷰에서 수집한 항목을 **하나도 빠뜨리지 않고** 양식에 반영
- 인터뷰에서 묻지 않았거나 사용자가 skip한 항목은 AI가 추론하여 채우고, 메타 헤더 옆에 `← 추론` 표시
- 참고곡 분석이 수행되었으면 분석 결과로 채워진 항목 옆에 `← 참고곡 분석 (WebSearch / Gemini / 신호)` 출처 표시

**가사 작성 규칙 (보컬 곡):**
- 구조 태그 포함: `[Intro]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Verse 2]`, `[Rap]`, `[Bridge]`, `[Outro]` 등
- **듀엣/다중 보컬 시** (장군님 결정 A-2): 구조 태그와 함께 `[Female]`, `[Male]`, `[Both]` 태그를 병행 — 예: `[Verse 1][Female]`, `[Chorus][Both]`. mmx가 보컬 음색을 전환하는 데 이 태그가 중요
- 장르와 분위기에 맞는 가사 스타일
- 보컬 스타일에 맞는 파트 분배 (그룹인 경우)
- `--structure`가 지정되었으면 해당 구조에 맞춤

**디렉션 작성 규칙:**
- 각 섹션 가사 블록 바로 아래에 `디렉션:` 라인으로 한 단락 기술 — 호흡/발성/감정 강도/박자감/특수 표현(staccato, breathy, belt 등)을 구체적으로
- 곡 중간 전조(modulation)가 있으면 해당 섹션 디렉션에 명시 (예: `D Major로 키 업 ½, 풀파워 100%`)
- 양식 말미 `💡 전체적인 보컬 가이드 팁`에는 곡 전체에 적용되는 발성·발음·에너지 흐름 가이드를 불릿으로 3~6개 정리
- **가사 줄에는 디렉션을 섞지 않음** — Stage 5에서 자동 분리되지만, 디렉션은 반드시 `디렉션:` 라인 또는 `💡 ...` 블록에만 위치

**타임코드 (장군님 결정 B):**
- 각 섹션 라벨 옆에 자연어 길이 표기 — `[Verse 1] (약 16초)`, `[Chorus] (약 32초)`
- 절대 시간(`0:00 ~ 0:24`)도 허용되며 파싱 시 자연어로 변환됨
- 타임코드는 mmx CLI에 직접 매핑되지 않고 `--prompt` 본문 디렉션 흐름의 시간 감각을 잡는 용도

**길이 가이드라인 (Easy Q6 / Expert Q9 답변 반영):**
- **짧고 깔끔하게**: 한 섹션 2-4줄, 전체 12-18줄, 후렴은 동일한 가사를 그대로 반복하여 hook을 강화
- **보통 (기본값)**: 한 섹션 4-6줄, 전체 20-30줄, 한 줄당 6-12 음절(한국어) / 6-10 단어(영어), Verse 2는 가사를 변형하되 후렴은 반복
- **풍성하게**: 한 섹션 6-8줄, 전체 30-40줄, Bridge에서 새로운 서사를 전개
- 사용자가 `--extra`에서 명시적 길이를 요청하면(예: "2분 길이") 해당 길이에 맞춰 줄 수를 조정 (명시 길이 우선)

**언어 비율 (Easy Q4 / Expert Q7 답변 기준):**
- **한국어 only**: 영어 단어 사용 금지 (제목·고유명사·관용 외국어 표기 제외)
- **영어 only**: 한국어 사용 금지
- **한국어+영어 믹스 (K-POP 전형)**: 영어 비율 **20-30% 이하**
  - 영어는 hook(후렴 핵심 구절) 또는 제목/캐치프레이즈에 한정
  - Verse는 한국어 위주로 서사를 전개, 영어는 강조 단어 1-2개 정도만 삽입
  - "Yeah", "Oh", "Baby", "Yes", "No" 같은 filler 영어 단어 남발 금지
  - 한 줄 전체를 영어로 채우는 빈도는 후렴/Bridge에 한정
- **일본어+영어 믹스 (J-POP 전형)**: 동일 원칙 (영어 20-30% 이하)
- 사용자가 명시적으로 다른 비율을 요청하면(예: "영어 위주로", "후렴까지 한국어로") 해당 요청 우선

**듀엣/다중 보컬 시 추가 필수 설정:**
- `--vocals`: "duet with harmonies, alternating male and female verses" 등 교대 구조를 명시
- `--extra`: "Must have two distinct vocal timbres" 등 음색 구분을 강조
- 이 설정 없이는 단일 보컬로 생성될 수 있음

**Stage 4 산출 예시 (보컬 곡, 전조 포함):**

```
🎵 곡 정보
제목: 두근 (Heartbeat)
장르: K-POP Dance Pop
분위기: bright, upbeat, sparkly
BPM: 118
Key: C Major → D Major (Final Chorus에서 ½ key up)
보컬 톤: 산뜻하고 청량한 미성, 후반부로 갈수록 에너지 ↑
악기: synth, electric guitar, dance drums, bass, hand claps
구조: intro-verse-prechorus-chorus-verse-prechorus-chorus-bridge-final_chorus-outro
사용 목적: 타이틀곡
참고곡: (없음)
피해야 할 요소: heavy distortion, autotune
추가 요청: 안무 포인트가 될 수 있게 후렴 박자감 살리기

🎤 가사 & 구간별 디렉션

[Intro] (약 8초)
Oh, na-na-na, oh, na-na-na
La-la, la-la, my heartbeat
디렉션: 숨을 살짝 섞은 브리시 발성, 마이크와 가까운 거리감. 음정 정확히 잡되 힘은 30%만. 혼잣말처럼 살짝 미소 띤 톤. 끝의 "my heartbeat"는 속삭이듯이.

[Verse 1] (약 16초)
처음 봤을 때부터
내 시간이 멈춘 것 같아
무심한 듯 스쳐간 너의 미소
온 종일 머릿속을 맴돌아
디렉션: 가볍게 톡톡 던지듯(staccato). "처음 봤을 때부터"는 한 호흡. "내 시간이 멈춘"에서 살짝 리듬을 끌어주기. "맴돌아"는 끝을 살짝 굴려서 여운. 감정 70%.

[Pre-Chorus] (약 16초)
한 발자국, 두 발자국
가까워질수록 빨라지는 박자
숨이 멎을 듯한 이 느낌
처음이야 이런 거 oh
디렉션: 점진적 빌드업. "한 발자국, 두 발자국"은 또박또박, "빨라지는 박자"부터 음정·호흡 상승. "숨이 멎을 듯한"에서 호흡을 짧게 끊어 긴장감. 마지막 "oh"는 후렴 진입을 위한 셋업.

[Chorus] (약 32초)
두근 두근 두근
내 심장이 자꾸 소리쳐
너야 너야 너야
이 세상에 너뿐이야
밤이 와도 잠 못 들어
네 얼굴이 자꾸 떠올라
두근 두근 두근
들리니 내 마음의 BGM
디렉션: 풀파워 90%, 밝게 트인 발성. "두근 두근 두근"은 가슴을 톡톡 치는 듯한 리듬감. "너야 너야 너야"에서 'ㄴ' 자음 또렷이 — 디스코 댄스 비트에 맞춰 짧게 끊어. "BGM"은 정확히 발음하고 끝을 짧게.

[Final Chorus] (약 32초)
두근 두근 두근
이젠 망설이지 않을래
너야 너야 너야
이 마음을 받아줄래
밤하늘의 별처럼
반짝이는 우리 둘만의 이야기
두근 두근 두근
이게 사랑의 BGM
디렉션: D Major로 키 업 ½. 풀파워 100%, 고음역에서 시원하게 터뜨리되 음정 안정성 최우선. "받아줄래"에서 살짝 끝을 올려 질문하듯. "반짝이는"은 한 글자씩 또박또박. 백킹은 풀하모니로 두텁게.

[Outro] (약 18초)
Oh, na-na-na, oh, na-na-na
두근 두근, my heartbeat for you
La-la, la-la
디렉션: 인트로와 수미상관. 다시 브리시 톤으로 회귀, 미소 짓고 끝나듯이. "for you"에서 살짝 웃음 섞기. 페이드아웃 동안 짧은 한국어 위스퍼 즉흥 1~2회.

💡 전체적인 보컬 가이드 팁
- 공기 반 소리 반의 청량한 톤이 핵심
- 자음(특히 ㅈ, ㅊ, ㅎ)을 또렷하게 — 댄스 곡은 발음이 곧 그루브
- Verse → Pre-Chorus → Chorus로 70% → 85% → 95% 단계적 에너지 상승
- 후렴 "두근 두근 두근"은 안무 포인트가 될 수 있게 박자감 살리기
```

**확인/수정:**
- 작성된 작곡 양식을 사용자에게 보여주고 확인 요청
- 수정은 **최대 3회**까지 허용 — 사용자가 자유 텍스트로 수정 요청 (예: "Verse 2를 추가해줘", "후렴 디렉션 더 강하게", "Bridge에 전조 추가")
- AI가 양식 전체를 재생성하여 다시 보여줌
- 3회 초과 시 현재 버전으로 진행

### Stage 5: CLI 구성 및 실행

**진입 조건 (장군님 결정 D-1, 2단계 확인):**
- Stage 3 자연어 프리뷰 확인 완료 (사용자 "확인" 응답) — 1차 확인
- Stage 4 통합 작곡 양식 확인 완료 (사용자 "확인" 응답, 또는 수정 3회 초과 후 "현재 버전으로 진행합니다." 안내) — 2차 확인
- Instrumental 모드인 경우: Stage 3 + Stage 4(편곡 디렉션 양식) 모두 확인 후 진입

**양식 → mmx 호출 변환 절차:**

Stage 4의 통합 작곡 양식을 Direct Mode 7번 "Composition Spec Parsing" 절차와 동일하게 분리하여 mmx CLI를 호출합니다:

1. **메타 헤더 추출** → 각 mmx CLI 옵션으로 매핑
   - `제목` → `--out` 파일명
   - `장르` → `--genre`, `분위기` → `--mood`
   - `BPM` → `--bpm` (숫자) 또는 `--tempo` (자연어)
   - `Key` → `--key` (단일 키이면 그대로, `A → B` 화살표면 시작 키만)
   - `보컬 톤` → `--vocals`, `악기` → `--instruments`
   - `구조` → `--structure`, `사용 목적` → `--use-case`
   - `참고곡` → `--references`, `피해야 할 요소` → `--avoid`, `추가 요청` → `--extra`
   - 곡 중간 전조 지시가 있으면 `--extra` 또는 `--prompt` 자연어에 통합
2. **가사 파일 작성** (보컬 곡 한정)
   - `mktemp`로 임시 파일 생성 (`lyrics_file="$(mktemp /tmp/mmx-lyrics-XXXXXX.txt)"`)
   - `chmod 600 "$lyrics_file"` 적용, `trap 'rm -f "$lyrics_file"' EXIT INT TERM`로 cleanup 보장
   - 양식에서 **가사 줄만** 추출 (섹션 라벨 + 가사 텍스트). 타임코드와 `디렉션:` 라인은 제거
   - 듀엣/그룹의 파트 태그(`[Female]`, `[Male]`, `[Both]`)는 보존
3. **`--prompt` 본문 조립** (필수)
   - 양식 메타의 `장르 + 분위기 + 보컬 톤`을 자연어 1~2문장으로 요약 (서두)
   - 각 섹션 `디렉션:` 라인을 시간순으로 합쳐 자연어 흐름으로 기술 (중간 부분, 타임코드는 자연어로 변환)
   - 곡 중간 전조 지시는 해당 섹션 디렉션 안에서 명시
   - `💡 전체적인 보컬 가이드 팁` 항목은 prompt 말미에 불릿이 아닌 자연어 단락으로 통합
4. **CLI 명령어 조립 → 사용자에게 보여주기**
5. **mmx 실행**
6. **결과 안내** (`trap`에 의해 임시 파일 자동 정리)

**Instrumental 모드 변환:**
- 가사 파일 작성(2번) 건너뛰기
- `--instrumental` 플래그 추가
- 양식의 "🎚 구간별 편곡 디렉션"을 `--prompt`에 자연어 흐름으로 통합

**Direct Mode와의 일관성:**
- Direct Mode A(분리형)에서는 이 절차의 1~6번을 사용자가 직접 제공한 가사·옵션 그대로 사용
- Direct Mode B(통합형)에서는 7번 "Composition Spec Parsing"으로 자동 분리한 뒤 동일한 1~6번 수행
- Interview Mode Stage 5에서는 Stage 4 양식을 입력으로 받아 1~6번 수행
- 셋 다 mmx 호출 형태는 동일

---

## Error Handling

| 에러 상황 | 감지 방법 | 대응 |
|-----------|-----------|------|
| mmx CLI 미설치 | `which mmx` 실패 | "mmx CLI가 설치되어 있지 않습니다. 설치 후 다시 시도해주세요." 안내 후 종료 |
| API 키 미설정 | mmx 실행 시 인증 에러 (exit code != 0, 에러 메시지에 "auth" 또는 "key" 포함) | "mmx API 키가 설정되지 않았습니다. `mmx auth` 또는 `--api-key` 설정을 확인해주세요." |
| 네트워크 오류 | mmx 실행 시 연결 실패 (에러 메시지에 "network" 또는 "connection" 포함) | "네트워크 연결을 확인해주세요." + 재시도 안내 |
| 생성 실패 | mmx exit code != 0 (위 케이스에 해당하지 않음) | 에러 메시지 표시 + "설정을 변경하여 다시 시도하시겠습니까?" |
| 임시 파일 생성 실패 | 파일 쓰기 에러 | "/tmp 디렉토리 권한을 확인해주세요." 안내 |

**중요:** 임시 가사 파일은 셸 종료 시 자동 삭제되도록 `trap`으로 처리합니다.

```bash
# EXIT/INT/TERM에서 cleanup 보장
LYRICS_TMP="$(mktemp /tmp/mmx-lyrics-XXXXXX.txt)"
chmod 600 "$LYRICS_TMP"
trap 'rm -f "$LYRICS_TMP"' EXIT INT TERM
# ... 가사 파일 생성 ...
mmx music generate ... --lyrics-file "$LYRICS_TMP" --out ~/Music/output.mp3
```

---

## Behavior

- 기본 오디오 포맷: mp3
- 기본 샘플레이트: 44100 Hz
- 기본 비트레이트: 256000 bps
- 출력 경로: `~/Music` (기본 출력 디렉토리, 없으면 자동 생성)
- 파일명: 곡 제목 기반 자동 생성
- 가사 전달: 보컬 곡일 때는 항상 `--lyrics-file` 사용 (임시 파일 경유, instrumental 시 생략)
- `--lyrics-optimizer` 미사용: Claude가 인터뷰 결과를 반영하여 직접 작사하는 것이 문맥 이해도와 품질 면에서 우수

---

## CLI Options Reference

mmx music generate의 전체 옵션 참조 테이블입니다:

| 옵션 | 타입 | 설명 | 본 스킬 사용 여부 |
|------|------|------|------------------|
| `--prompt` | text | 음악 스타일 설명 **(필수)** | O (항상 생성) |
| `--lyrics` | text | 가사 직접 전달 | X (--lyrics-file 사용) |
| `--lyrics-file` | path | 파일에서 가사 읽기 | O (기본 전략) |
| `--lyrics-optimizer` | flag | 프롬프트 기반 자동 가사 생성 | X (Claude가 작사) |
| `--instrumental` | flag | 인스트루멘탈 모드 (보컬 없음) | O |
| `--vocals` | text | 보컬 스타일 설명 | O |
| `--genre` | text | 음악 장르 | O |
| `--mood` | text | 분위기/감정 | O |
| `--tempo` | text | 빠르기 자연어 설명 (fast, slow 등) | O (Easy 모드) |
| `--bpm` | number | 정확한 BPM 숫자 | O (Expert 모드) |
| `--key` | text | 음악 Key (예: C major) | O (Expert 모드) |
| `--instruments` | text | 사용 악기 | O |
| `--structure` | text | 곡 구조 | O (Expert 모드) |
| `--avoid` | text | 피해야 할 요소 | O (Expert 모드) |
| `--references` | text | 참고곡/아티스트 | O |
| `--use-case` | text | 사용 목적 | O (Easy 모드) |
| `--extra` | text | 추가 세부 요청 | O |
| `--aigc-watermark` | flag | AI 생성 컨텐츠 워터마크 삽입 | 선택 |
| `--format` | fmt | 오디오 포맷 (기본: mp3) | 선택 |
| `--sample-rate` | hz | 샘플레이트 (기본: 44100) | 선택 |
| `--bitrate` | bps | 비트레이트 (기본: 256000) | 선택 |
| `--stream` | flag | 실시간 오디오 스트리밍 | 선택 |
| `--out` | path | 출력 파일 경로 | O (항상 지정) |

---

## Interview Mode 대화 예시

### Easy 모드 (보컬 곡)

```
AI: "인스트루멘탈(반주만)로 만드시겠습니까, 보컬이 있는 노래로 만드시겠습니까?"
사용자: "보컬 있는 노래"

AI: "음악 설정을 어떻게 진행할까요? [Easy / Expert]"
사용자: "Easy"

AI: "이 노래는 어떤 용도로 사용하시나요?"
    힌트: 타이틀곡, 유튜브/숏폼 배경음악, 게임 OST, 카페 음악...
사용자: "유튜브 브이로그 배경음악"

AI: "어떤 느낌의 노래를 만들고 싶으세요? 장르나 분위기를 자유롭게 설명해 주세요!"
    힌트: "여름에 듣기 좋은 신나는 댄스곡", "비 오는 날 듣는 잔잔한 발라드"...
사용자: "여름 느낌 나는 밝고 신나는 노래"
→ AI 추론: genre=Summer Pop, mood=bright/upbeat, tempo=fast

AI: "어떤 목소리로 불렀으면 좋겠나요?"
    힌트: 여성 솔로(맑고 청량한), 남성 솔로(따뜻한 중저음), 남녀 듀엣(로맨틱한 하모니)...
사용자: "여자 목소리, 맑은 느낌"

AI: "가사는 어떤 언어로 만들까요?"
    힌트: 한국어, 영어, 일본어, 한국어+영어 믹스...
사용자: "skip"
→ AI 추론: Summer Pop + 밝은 분위기 → 영어+한국어 믹스

AI: "노래의 주제나 이야기는 어떤 건가요?"
    힌트: 사랑/설렘, 이별/그리움, 여름/계절, 파티/자유...
사용자: "여름 바다 여행"

AI: "가사를 어떻게 만들까요?"
    선택지: 짧고 깔끔하게 / 보통 / 풍성하게
사용자: "skip"
→ AI 적용: "보통" (각 섹션 4-6줄, 후렴 반복형, 영어 비율 20-30%)

AI: "참고할 곡/아티스트가 있거나, 추가로 원하는 게 있으면 자유롭게 말씀해 주세요!"
사용자: "2분 정도 길이로 해주세요"
→ AI 조정: 명시 길이(2분) 우선 → "짧고 깔끔하게" 가이드라인으로 자동 전환

--- 노래 프리뷰 ---

🎵 노래 프리뷰

"여름 바다 여행"을 테마로 한 Summer Pop 장르의 밝고 신나는 노래입니다.
맑고 청량한 여성 보컬이 한국어+영어 믹스 가사를 부르며,
신스, 어쿠스틱 기타, 드럼이 경쾌한 반주를 만듭니다.
BPM 125의 빠른 템포로, 약 2분 길이의 유튜브 브이로그 배경음악에
어울리는 곡입니다.

이대로 진행할까요?
[확인] [수정 요청]

사용자: "기타 대신 우쿨렐레로 바꿔줘"
→ AI가 instruments를 수정하여 프리뷰 재생성

사용자: "확인"
→ 곡 제목 질문 → 가사 생성(Stage 4) → CLI 실행(Stage 5)
```

### Easy 모드 (Instrumental)

```
AI: "인스트루멘탈(반주만)로 만드시겠습니까, 보컬이 있는 노래로 만드시겠습니까?"
사용자: "반주만"

AI: "음악 설정을 어떻게 진행할까요? [Easy / Expert]"
사용자: "Easy"

AI: "이 노래는 어떤 용도로 사용하시나요?"
사용자: "카페 배경음악"

AI: "어떤 느낌의 노래를 만들고 싶으세요?"
사용자: "비 오는 날 창밖 보면서 듣는 잔잔한 재즈"
→ AI 추론: genre=Lo-fi Jazz, mood=calm/rainy, tempo=slow

AI: "참고할 곡/아티스트가 있거나, 추가로 원하는 게 있으면 자유롭게 말씀해 주세요!"
사용자: "skip"

--- 노래 프리뷰 ---

🎵 노래 프리뷰

비 오는 날 카페에서 흘러나올 법한 Lo-fi Jazz 인스트루멘탈입니다.
피아노와 부드러운 색소폰이 따뜻한 분위기를 만들고,
바이닐 크래클과 잔잔한 드럼 브러시가 아늑함을 더합니다.
BPM 75의 느린 템포로, 카페 배경음악으로 딱 좋습니다.

이대로 진행할까요?
[확인] [수정 요청]

사용자: "확인"
→ 곡 제목 질문 → CLI 실행(Stage 5, 가사 생성 건너뜀)
```

---

## Reference Song Analysis

Interview Mode에서 참고곡/아티스트가 입력되면 WebSearch로 상세 정보를 수집하여 CLI 옵션에 자동 반영합니다.

### 트리거 조건

참고곡 질문(Easy Q7 / Expert Q11)의 답변에서 다음 패턴이 감지될 때:

| 패턴 | 예시 | 분석 방식 |
|------|------|-----------|
| `아티스트 - 곡명` | "IU - Blueming", "BTS - Dynamite" | WebSearch |
| `아티스트의 곡명` | "아이유의 블루밍" | WebSearch |
| `곡명 + 느낌/스타일/같은` | "Blueming 느낌", "Dynamite 같은" | WebSearch |
| `아티스트 + 스타일/느낌` | "아이유 스타일", "뉴진스 느낌" | WebSearch |
| **YouTube URL** | `https://youtube.com/watch?v=...`, `https://youtu.be/...`, `https://music.youtube.com/...` | **Audio Analysis (YouTube)** |
| **로컬 MP3 파일 경로** | `/Users/me/Music/song.mp3`, `~/Downloads/track.mp3`, `"/path/with spaces/ref.mp3"` | **Audio Analysis (Local MP3)** |

**단순 장르/분위기 설명은 트리거하지 않음:** "기타 소리 많이", "2분 정도 길이로" 등은 기존대로 `--references`/`--extra`로 처리.

### 분석 방식 A: WebSearch (텍스트 기반 참고곡)

1. **검색 쿼리 구성:**
   ```
   WebSearch: "{아티스트} {곡명} song genre BPM key mood instruments vocal style analysis"
   ```
   - 곡명만 있는 경우: `"{곡명} song genre BPM analysis"`
   - 아티스트만 있는 경우: `"{아티스트} music style genre characteristics"`

2. **추출 대상 정보:**

   | 항목 | 설명 | 매핑 CLI 옵션 |
   |------|------|--------------|
   | genre | 장르 (예: Synth Pop, Disco Funk) | `--genre` |
   | bpm | 빠르기 숫자 | `--bpm` |
   | key | 음악 Key (예: G major) | `--key` |
   | mood | 분위기/감정 (예: bright, dreamy) | `--mood` |
   | instruments | 주요 악기 구성 | `--instruments` |
   | vocal style | 보컬 특성 | `--vocals` |
   | tempo | 빠르기 자연어 (fast, slow 등) | `--tempo` |

3. **검색 실패 시:** 에러 없이 기존 방식으로 fallback (텍스트 그대로 `--references`에 전달)

### 분석 방식 B: Audio Analysis (YouTube URL 또는 로컬 MP3)

YouTube URL 또는 로컬 MP3 파일이 감지되면 실제 오디오를 분석합니다. 두 가지 분석 레이어를 순차 실행하여 정성적/정량적 분석을 결합합니다.

**소스 분기:** Step 1·Step 2는 입력 소스(URL 또는 로컬 MP3)에 따라 분기되며, Step 3 이후의 분석 레이어/결과 통합/임시 파일 정리 절차는 두 소스가 동일합니다.

#### Step 1: 사전 확인

**A. 소스가 YouTube URL인 경우:**
```bash
which yt-dlp  # 필수 — 없으면 "yt-dlp가 필요합니다. 사용 중인 패키지 매니저(예: brew/apt/dnf)로 설치해주세요." 안내 후 WebSearch fallback
```

**B. 소스가 로컬 MP3 경로인 경우:**
```bash
# 1) ~ 확장. eval은 입력에 임의 셸 메타문자를 허용해 위험하므로 사용하지 말 것.
local_input="$user_input"
case "$local_input" in
  "~"|"~/"*) local_mp3="${HOME}${local_input#~}" ;;
  *)         local_mp3="$local_input" ;;
esac

# 2) 파일 존재/권한/확장자 검증
[ -f "$local_mp3" ] || { echo "지정한 파일을 찾을 수 없습니다: $local_mp3"; }   # 실패 시 사용자에게 재입력 요청 또는 텍스트 fallback
[ -r "$local_mp3" ] || { echo "파일 읽기 권한이 없습니다: $local_mp3"; }       # 실패 시 텍스트 fallback
case "$local_mp3" in
  *.mp3|*.MP3) ;;
  *) echo "현재는 MP3 파일만 지원합니다: $local_mp3" ;;                       # 실패 시 텍스트 fallback
esac
```
- 검증 실패 시: 사용자에게 다시 입력을 요청하거나, 응답 텍스트를 그대로 `--references`로 두고 WebSearch fallback
- `yt-dlp` 미설치는 로컬 MP3 분석에 영향 없음 (해당 분기는 yt-dlp 호출 자체가 없음)

#### Step 2: 오디오 소스 준비

분석 대상 파일은 `$ref_tmp_dir/reference.mp3` 한 곳으로 통일합니다. 임시 디렉터리는 `trap`으로 cleanup 대상에 등록하되, **사용자 원본 파일(`$local_mp3`)은 어떠한 경우에도 삭제·수정하지 않습니다.**

> Claude 실행 환경에서 기존 가사 `trap`과 충돌할 수 있는 경우, 단일 trap으로 통합하거나 분석 직후 `rm -rf "$ref_tmp_dir"`로 수동 정리합니다. 어느 방식이든 cleanup 범위는 `$ref_tmp_dir`로 한정해야 합니다.

**A. 소스가 YouTube URL인 경우:**
```bash
ref_tmp_dir="$(mktemp -d /tmp/mmx-ref-XXXXXX)"
trap 'rm -rf "$ref_tmp_dir"' EXIT INT TERM
yt-dlp -x --audio-format mp3 --audio-quality 0 -o "$ref_tmp_dir/reference.%(ext)s" -- "<YOUTUBE_URL>"
ref_mp3="$ref_tmp_dir/reference.mp3"
ref_title="$(yt-dlp --get-title -- "<YOUTUBE_URL>")"
ref_source_label="\"${ref_title}\" (YouTube)"
```

- 다운로드 실패 시: "영상을 다운로드할 수 없습니다." 안내 후 WebSearch fallback

**B. 소스가 로컬 MP3 경로인 경우:**
```bash
ref_tmp_dir="$(mktemp -d /tmp/mmx-ref-XXXXXX)"
trap 'rm -rf "$ref_tmp_dir"' EXIT INT TERM

# 사용자 원본 파일은 그대로 두고, 분석 디렉터리에 안전한 이름으로 복사.
# Gemini --include-directories는 디렉터리 단위 컨텍스트를 받으므로
# 같은 폴더의 다른 파일이 컨텍스트에 섞여 들어가는 것을 막기 위해서도 격리 복사가 안전.
ref_mp3="$ref_tmp_dir/reference.mp3"
cp -- "$local_mp3" "$ref_mp3" || { echo "임시 디렉터리 복사 실패"; }   # 실패 시 텍스트 fallback

# 곡 제목 추출: ID3 태그(title) 우선, 없으면 파일명 fallback
ref_title=""
if command -v ffprobe >/dev/null 2>&1; then
  ref_title="$(ffprobe -v error -show_entries format_tags=title -of default=nw=1:nk=1 "$ref_mp3" 2>/dev/null || true)"
fi
[ -z "$ref_title" ] && ref_title="$(basename "$local_mp3" .mp3)"
ref_source_label="\"${ref_title}\" (Local MP3)"
```

- 복사 실패(권한/디스크 부족) 시: 텍스트 fallback (`--references`에 파일명/곡 제목 텍스트만 전달)
- 사용자 원본 파일은 절대 `rm`·수정하지 않음 — cleanup 대상은 오직 `$ref_tmp_dir`

#### Step 3: 분석 레이어 실행

**레이어 1: Gemini 청취 분석 (정성적)** — `which gemini` 성공 시에만 실행

Gemini CLI로 오디오를 직접 청취하여 음악적 해석을 수행합니다:

```bash
gemini -y -m gemini-3.1-pro-preview --include-directories "$ref_tmp_dir" -p "Analyze $ref_mp3. Output ONLY valid JSON for {\"genre\", \"mood\", \"vocal_style\", \"instruments\", \"structure\", \"key_characteristics\", \"similar_to\"}. Skip any preamble or planning." 2>&1
```

**중요 사항:**
- `-m gemini-3.1-pro-preview`: 오디오 멀티모달을 지원하는 모델을 명시해야 함 (기본 flash 모델은 오디오 청취 불가)
- 프롬프트에 파일 절대 경로를 직접 포함해야 함 (변수 확장 필요)
- "Skip any preamble or planning" 지시로 빈 응답 방지
- 429 rate limit 발생 시 Gemini CLI가 자체 backoff 재시도를 수행함 (최대 3회)

- Gemini가 설치되지 않았거나 실패 시: 이 레이어를 건너뛰고 레이어 2로 진행

**레이어 2: 신호 분석 (정량적)** — ffprobe + python3 + numpy 사용

`ffprobe`와 `numpy`가 설치되어 있으면 Claude가 직접 신호 분석을 수행합니다:

```bash
# 기본 메타데이터
ffprobe -v error -show_format -show_streams -of json "$ref_mp3"
```

```python
# BPM 추정 + 주파수 대역 에너지 + 다이나믹스 분석
# 주의: ref_mp3는 실행 시 실제 경로 문자열로 치환해야 함 (예: f-string 또는 sys.argv)
import subprocess, numpy as np, json, sys
ref_mp3 = sys.argv[1]  # 실행 시: python3 script.py /tmp/mmx-ref-XXXXXX/reference.mp3
sr = 22050
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', ref_mp3, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'])
y = np.frombuffer(raw, dtype=np.float32)
# ... (onset detection → autocorrelation BPM, band energy ratio, RMS/crest, spectral centroid)
```

> **참고:** 이 레이어는 `ffmpeg`에도 의존합니다. `which ffmpeg` 실패 시 이 레이어를 건너뜁니다.

추출하는 정량 데이터:
| 항목 | 설명 | 매핑 CLI 옵션 |
|------|------|--------------|
| bpm_estimate | 자기상관 기반 BPM 추정 | `--bpm` |
| band_energy_ratio | 주파수 대역별 에너지 비율 (sub/bass/mid/high) | `--instruments` 추론 보조 |
| spectral_centroid_hz | 평균 스펙트럼 중심 주파수 | 밝기/어두움 추론 |
| crest_db | 다이나믹 레인지 | 장르 추론 보조 |
| rms_by_section | 구간별 에너지 변화 | `--structure` 추론 보조 |

- ffprobe 또는 numpy 미설치 시: 이 레이어를 건너뛰기

#### Step 4: 결과 통합

두 레이어의 결과를 하나의 참고곡 분석 리포트로 통합합니다:

| 항목 | Gemini 결과 | 신호 분석 결과 | 최종 결정 |
|------|------------|---------------|-----------|
| genre | 정성적 장르 판단 | - | Gemini 우선 |
| bpm | - | 정량적 BPM 수치 | 신호 분석 우선 |
| mood | 감정/분위기 해석 | 스펙트럼 밝기 보조 | Gemini 우선, 신호 보조 |
| instruments | 악기 식별 | 대역 에너지로 추론 | Gemini 우선, 신호 보조 |
| vocal_style | 보컬 특성 분석 | - | Gemini 전담 |
| structure | 곡 구조 파악 | 구간별 에너지 변화 | Gemini 우선, 신호 보조 |
| key | - | - | 추출 불가 시 생략 |

**Gemini만 사용 가능한 경우:** Gemini 결과만으로 리포트 구성
**신호 분석만 사용 가능한 경우:** 정량 데이터 기반으로 장르/분위기를 AI가 추론
**둘 다 사용 불가한 경우:** WebSearch fallback (영상 제목으로 검색)

#### Step 5: 임시 파일 정리

`trap`에 의해 세션 종료 시 `$ref_tmp_dir`이 자동 정리됩니다.

**중요:** cleanup 범위는 분석용 임시 디렉터리(`$ref_tmp_dir`)에 한정합니다. 로컬 MP3 모드에서 사용자 원본 파일(`$local_mp3`)은 분석 후에도 그대로 보존되어야 하며, 어떠한 단계에서도 `rm`·이동·덮어쓰기 대상이 되어서는 안 됩니다.

### 병합 규칙

검색 결과와 사용자 인터뷰 답변이 겹칠 때의 우선순위:

| 상황 | 처리 |
|------|------|
| 사용자가 해당 항목에 직접 답변함 | **사용자 답변 우선** (검색 결과 무시) |
| 사용자가 해당 항목을 skip함 | **검색 결과로 채움** |
| 사용자가 해당 항목을 질문받지 않음 (Easy 모드) | **검색 결과를 `--prompt`에 자연어로 녹임** |
| 검색에서 해당 정보를 찾지 못함 | 기존 로직대로 AI 추론 또는 생략 |

**핵심 원칙:** 사용자의 명시적 선택은 절대 덮어쓰지 않는다. 검색 결과는 빈 칸을 채우는 보조 역할.

### 프리뷰 반영

참고곡 분석이 수행된 경우, Stage 3 프리뷰 상단에 분석 요약을 포함합니다.

**WebSearch 분석 프리뷰:**
```
🎵 노래 프리뷰

🔍 참고곡 분석: BTS - Dynamite
   → Disco Pop / Funk Pop, BPM 114, 밝고 에너제틱한 레트로 분위기
   → 주요 악기: funk guitar, bass, brass, synth
   → 보컬: bright male tenor, group harmonies

"여름 파티"를 테마로 한 Disco Pop 장르의 밝고 신나는 노래입니다.
맑고 에너지 넘치는 남성 보컬이 영어 가사를 부르며,
펑크 기타와 브라스가 레트로한 분위기를 만듭니다.
BPM 114의 경쾌한 템포로, 파티 분위기에 어울리는 곡입니다.

이대로 진행할까요?
[확인] [수정 요청]
```

**상세 설정 보기에도 참고곡 분석 출처 표시:**
```
<details>
<summary>상세 설정 보기</summary>

- 장르(--genre): Disco Pop ← 참고곡 분석 (WebSearch)
- 분위기(--mood): bright, energetic, retro ← 참고곡 분석 (WebSearch)
- BPM(--bpm): 114 ← 참고곡 분석 (WebSearch)
- 보컬(--vocals): bright male tenor ← 사용자 선택
- 악기(--instruments): funk guitar, bass, brass, synth ← 참고곡 분석 (WebSearch)
- 참고(--references): BTS - Dynamite
</details>
```

**Audio Analysis 프리뷰 (YouTube 소스):**
```
🎵 노래 프리뷰

🎧 참고곡 오디오 분석: "월의 끝에서" (YouTube)
   🔊 Gemini 청취: J-Pop / 애니송 팝 록, 아련하고 감성적, 여성 보컬 (청아한 소프라노)
   📊 신호 분석: BPM 78, 중저역 중심 (bass 27% + low_mid 25%), 후반부 에너지 상승 구조
   🎹 악기: 피아노(주), 일렉기타, 드럼, 신스 패드

"그리운 사람에게 보내는 편지"를 테마로 한 J-Pop 감성 발라드입니다.
청아한 여성 보컬이 일본어+한국어 믹스 가사를 부르며,
피아노와 스트링이 서정적인 편곡을 만듭니다.
BPM 78의 느린 템포로, 감성적인 앨범 수록곡에 어울리는 곡입니다.

이대로 진행할까요?
[확인] [수정 요청]
```

```
<details>
<summary>상세 설정 보기</summary>

- 장르(--genre): J-Pop Ballad ← Gemini 청취
- 분위기(--mood): melancholic, nostalgic, emotional ← Gemini 청취
- BPM(--bpm): 78 ← 신호 분석
- 보컬(--vocals): clear bright female soprano ← Gemini 청취
- 악기(--instruments): piano, electric guitar, drums, synth pad ← Gemini 청취 + 신호 보조
- 참고(--references): "월의 끝에서" (Audio Analysis - YouTube 소스, 원본 URL은 내부 추적용)
</details>
```

**Audio Analysis 프리뷰 (로컬 MP3 소스):**
```
🎵 노래 프리뷰

🎧 참고곡 오디오 분석: "Late Night Drive" (Local MP3)
   🔊 Gemini 청취: Synthwave / Retro Pop, 야간 드라이브 분위기, 남성 보컬 (몽환적 팔세토)
   📊 신호 분석: BPM 102, 중역 신스 두드러짐, 일정한 다이나믹 레인지
   🎹 악기: 신스 패드, 신스 베이스, 게이트 리버브 드럼

"새벽 도시의 외로움"을 테마로 한 Synthwave 장르의 몽환적인 노래입니다.
팔세토 남성 보컬이 영어 가사를 부르며,
80년대풍 신스와 게이트 리버브 드럼이 레트로한 분위기를 만듭니다.
BPM 102의 미디엄 템포로, 야간 드라이브에 어울리는 곡입니다.

이대로 진행할까요?
[확인] [수정 요청]
```

```
<details>
<summary>상세 설정 보기</summary>

- 장르(--genre): Synthwave ← Gemini 청취
- 분위기(--mood): dreamy, nostalgic, late-night ← Gemini 청취
- BPM(--bpm): 102 ← 신호 분석
- 보컬(--vocals): male falsetto with reverb ← Gemini 청취
- 악기(--instruments): synth pad, synth bass, gated reverb drums ← Gemini 청취 + 신호 보조
- 참고(--references): "Late Night Drive" (Audio Analysis - Local MP3 소스, 원본 파일 경로는 내부 추적용)
</details>
```

---

## Notes

- mmx CLI가 설치되어 있어야 합니다 (`which mmx`로 확인)
- 생성에 시간이 걸릴 수 있습니다 (곡 길이에 따라 수십 초 ~ 수 분)
- `--references`는 **텍스트 설명만 지원**합니다 (예: "similar to IU", "BTS - Dynamite 같은 느낌"). YouTube URL이나 로컬 MP3 경로를 직접 `--references`에 넣지 않고, 분석 후 영상 제목·곡 제목·아티스트명 텍스트로 변환하여 전달합니다. Interview Mode에서 참고곡 분석은 세 가지 방식을 지원합니다:
  - **텍스트 참고곡** (곡명/아티스트): WebSearch로 상세 정보를 자동 수집
  - **YouTube URL**: yt-dlp로 MP3 다운로드 후, Gemini 청취 분석(정성적) + ffprobe/numpy 신호 분석(정량적)을 결합하여 분석
  - **로컬 MP3 파일 경로**: yt-dlp 없이 사용자가 직접 제공한 MP3 파일을 임시 디렉터리에 격리 복사한 뒤, 동일한 Gemini 청취 분석 + ffprobe/numpy 신호 분석을 수행. 사용자 원본 파일은 분석 후에도 그대로 보존되며, 곡 제목은 ID3 태그가 없으면 파일명으로 fallback. 현재 지원 포맷: `.mp3` 단일 (다른 포맷은 추후 확장 예정)
  - 공통: Gemini CLI가 설치되어 있으면 `-m gemini-3.1-pro-preview` 모델로 오디오를 직접 듣고 해석하며 (기본 flash 모델은 오디오 청취 불가), ffprobe + numpy가 있으면 BPM/스펙트럼 등 정량 데이터를 추출합니다. 분석 결과는 `--prompt`, `--genre`, `--mood`, `--bpm` 등에 자동 반영됩니다 (상세는 "Reference Song Analysis" 섹션 참조)
- `--instrumental`과 `--lyrics`/`--lyrics-file`은 동시 사용 불가
- `--bpm`(숫자)과 `--tempo`(자연어)는 모두 사용 가능하며, 둘 다 제공 시 `--bpm`이 우선
- Expert 모드에서 오디오 품질 옵션(`--format`, `--sample-rate`, `--bitrate`)은 추가 요청사항(Q9)에서 자유 텍스트로 요청 가능
- **통합 작곡 양식 입력 (Direct Mode B)**: 사용자가 `🎵 곡 정보 / 🎤 가사 & 구간별 디렉션 / 💡 보컬 가이드 팁` 한 덩어리 텍스트로 의뢰하면, "Composition Spec Parsing" 절차가 자동 실행되어 가사·디렉션·메타가 분리되어 mmx에 전송됨. 양식과 별도 CLI 플래그 값이 충돌하면 사용자에게 한 번 확인을 요청 (장군님 결정 C-2). 누락된 메타는 AI가 양식 내용으로 추론하여 채우고 알림만 표시 (장군님 결정 E-2)
- **Interview Mode 2단계 확인** (장군님 결정 D-1): Stage 3 자연어 프리뷰 → 1차 확인 → Stage 4 통합 작곡 양식 → 2차 확인 → Stage 5 mmx 호출
- **타임코드**는 양식에 자연어로 표기하며(`(약 16초)`), mmx CLI에는 자연어 흐름으로 `--prompt`에 녹여 전달 (장군님 결정 B)
- **곡 중간 전조**는 양식 `Key:` 헤더에 화살표 표기를 허용하되, mmx 호출 시 `--key`에는 시작 키만 보내고 전조 지시는 `--extra` 또는 `--prompt`에 자연어로 분리됨 (장군님 결정 A-3)

