async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

export const POST_CAPTION_LIMIT = 2200;
export const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024;
export const VIDEO_DURATION_LIMIT_SECONDS = 60;

export async function getProfile() {
  const { profile } = await api('/profile');
  return profile;
}

export async function updateProfile(_userId, updates) {
  return api('/profile/bio', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio: updates.bio }),
  });
}

export async function getUserPosts() {
  const { posts } = await api('/posts/mine');
  return posts;
}

export async function getFeed() {
  const { posts } = await api('/posts/feed');
  return posts;
}

export async function createPost(_userId, { file, caption }) {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('caption', caption);
  return api('/posts', { method: 'POST', body: formData });
}

export async function deletePost(postId) {
  return api(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
}

export async function getPostDetail(postId) {
  return api(`/posts/${encodeURIComponent(postId)}`);
}

export async function togglePostLike(postId) {
  return api(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
}

export async function addComment(postId, comment) {
  return api(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
}

export async function deleteComment(postId, commentId) {
  return api(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}

export async function getPostRequests() {
  const { posts } = await api('/posts/requests');
  return posts;
}

export async function reviewPost(postId, action, remarks = '') {
  return api(`/posts/${encodeURIComponent(postId)}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, remarks }),
  });
}
