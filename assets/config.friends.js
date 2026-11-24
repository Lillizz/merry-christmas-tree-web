/**
 * 친구/공개용(friends) 배포 페이지 설정
 *
 * - 새 공개 GitHub 레포 이름이 다른 경우 아래 `githubRepo` 한 줄만 수정하세요.
 *   예: 'Lillizz/merry-christmas-tree-web'
 * - 릴리즈 태그는 `friends-v2.1.0` 형식을 최우선으로 매칭하며,
 *   해당 태그가 없을 때는 일반 `v2.1.0` 릴리즈도 함께 인식합니다.
 */
window.APP_DOWNLOAD_CONFIG = {
  edition: 'friends',
  appName: '메리크리스마스트리',
  githubRepo: 'Lillizz/merry-christmas-tree-web',
  tagPrefix: 'friends-v',
  allowPlainVTag: true,
  excludeTagPrefixes: ['company-', 'corp-'],
  cacheTtlMs: 5 * 60 * 1000,
  fallbackVersion: '2.3.3',
  fallbackDownloads: {
    'mac-arm64': '',
    'mac-x64': '',
    'win-x64': '',
  },
};
