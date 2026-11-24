/**
 * 사내용(company) 배포 페이지 설정
 *
 * - 새 공개 GitHub 레포 이름이 다른 경우 아래 `githubRepo` 한 줄만 수정하세요.
 *   예: 'Lillizz/merry-christmas-tree-web'
 * - 사내용 배포 파일이 타 에디션과 섞이지 않도록
 *   반드시 `company-v*` 태그가 붙은 릴리즈만 매칭합니다.
 */
window.APP_DOWNLOAD_CONFIG = {
  edition: 'company',
  appName: '메리크리스마스트리',
  githubRepo: 'Lillizz/merry-christmas-tree-web',
  tagPrefix: 'company-v',
  allowPlainVTag: false,
  excludeTagPrefixes: ['friends-'],
  cacheTtlMs: 5 * 60 * 1000,
  fallbackVersion: '2.3.1',
  fallbackDownloads: {
    'mac-arm64': '',
    'mac-x64': '',
    'win-x64': '',
  },
};
