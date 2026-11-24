# 메리크리스마스트리 배포 웹 페이지

**메리크리스마스트리** 데스크탑 위젯 앱의 설치 파일을 OS별로 배포하는 정적 웹 페이지입니다.  
빌드 도구 없이 순수 HTML / CSS / JavaScript로 구성되어 GitHub Pages 또는 Vercel에 바로 배포할 수 있습니다.

---

## 1. 페이지 경로 구조

| 경로 | 대상 에디션 | 설명 |
| :--- | :--- | :--- |
| `/` (`index.html`) | 친구/공개용 (`friends`) | 외부 배포용 메인 다운로드 페이지 |
| `/company/` (`company/index.html`) | 사내용 (`company`) | 사내 전용 다운로드 페이지 (`noindex`, `robots.txt` 차단 포함) |
| `/install-mac.sh` | 공용 macOS 설치 스크립트 | 브라우저 격리(`com.apple.quarantine`) 없이 자동 설치·실행하는 macOS 스크립트 |

두 페이지는 UI·설정 파일(`config.friends.js` / `config.company.js`)·릴리즈 태그 매칭이 완전히 분리되어 있습니다.

---

## 2. GitHub 레포 & Pages 연결 방법

1. GitHub에 **공개(Public)** 저장소 `Lillizz/merry-christmas-tree-web`을 생성하고 이 폴더를 푸시합니다.
   - 저장소 이름이 다른 경우 `assets/config.friends.js`, `assets/config.company.js`, `install-mac.sh`의 `githubRepo` / `REPO_SLUG`를 함께 수정하세요.
2. GitHub 저장소 **Settings > Pages**에서 **Build and deployment > Source**를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 저장합니다.
   - 배포 주소: `https://lillizz.github.io/merry-christmas-tree-web/` (친구용), `/company/` (사내용)

---

## 3. Private 소스 레포(`Lillizz/xmas-tree`)에서 자동 릴리즈 연동

소스 코드 저장소(`Lillizz/xmas-tree`)가 **Private**여도 Fine-grained PAT 하나만 등록하면 태그(`v*`) 푸시 시 이 Public 저장소의 Releases로 설치 파일이 자동 업로드됩니다.

1. GitHub **Settings > Developer settings > Personal access tokens > Fine-grained tokens**에서 토큰 생성
   - **Repository access**: `Only select repositories` → `Lillizz/merry-christmas-tree-web` 선택
   - **Permissions > Repository permissions**: `Contents: Read and write`
2. 소스 저장소(`Lillizz/xmas-tree`) **Settings > Secrets and variables > Actions**에 `RELEASE_REPO_TOKEN` 이름으로 위 토큰 등록
3. `xmas-tree`에서 `v2.2.0` 등 `v*` 태그를 푸시하면 `.github/workflows/release.yml`이 아래 두 릴리즈를 자동 생성·갱신합니다:
   - **친구/공개용 릴리즈**: 태그 `friends-v2.2.0` (`--latest`)
     - `MerryChristmasTree-friends-2.2.0-arm64.dmg` (macOS Apple Silicon)
     - `MerryChristmasTree-friends-2.2.0-x64.dmg` (macOS Intel)
     - `MerryChristmasTree-friends-Setup-2.2.0-x64.exe` (Windows 64-bit)
   - **사내용 릴리즈**: 태그 `company-v2.2.0` (`--latest=false`, **반드시 `company-v` 접두사 사용**)
     - `MerryChristmasTree-company-2.2.0-arm64.dmg` (macOS Apple Silicon)
     - `MerryChristmasTree-company-2.2.0-x64.dmg` (macOS Intel)
     - `MerryChristmasTree-company-Setup-2.2.0-x64.exe` (Windows 64-bit)

---

## 4. macOS 무경고 1줄 설치 명령어

```bash
# 친구용 (friends)
curl -fsSL https://lillizz.github.io/merry-christmas-tree-web/install-mac.sh | bash -s -- friends

# 사내용 (company)
curl -fsSL https://lillizz.github.io/merry-christmas-tree-web/install-mac.sh | bash -s -- company
```

브라우저로 `.dmg`를 직접 받아 설치한 뒤 "손상되었기 때문에 열 수 없습니다"가 뜨는 경우:
```bash
xattr -cr /Applications/MerryChristmasTree.app
```
