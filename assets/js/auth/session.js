const ALLOWED_UIDS = new Set([
  'fiiTfAA6tWRWSiIi9mhni91XU2y1',
  'by7lDskaTvPBOqEg3OOBXw0GWWw1',
]);

export function isAllowedUser(user) {
  return user != null && ALLOWED_UIDS.has(user.uid);
}
