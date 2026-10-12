// Selected-photo corrections use the authenticated server endpoint; this helper
// deliberately does not write jobs, photo rows, Storage objects or local queues.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.QaPhotoCorrections = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const operationFields = ['jobId', 'photoId', 'expectedPath', 'expectedReturnedAt', 'reason', 'file'];

  class PhotoCorrectionError extends Error {
    constructor(message, options) {
      super(message);
      options = options || {};
      this.name = 'PhotoCorrectionError';
      this.status = options.status || 0;
      this.code = options.code || 'photo_correction_failed';
      this.details = options.details || null;
      this.retryable = options.retryable === undefined ? this.status >= 500 : !!options.retryable;
      if (options.cause) this.cause = options.cause;
    }
  }

  function invalid(code, message) {
    return new PhotoCorrectionError(message, { code });
  }

  function target(input) {
    input = input || {};
    const rawJobId = input.jobId;
    if ((typeof rawJobId !== 'string' && typeof rawJobId !== 'bigint' && !Number.isSafeInteger(rawJobId)) || !String(rawJobId).trim()) {
      throw invalid('invalid_job_id', 'Select a job before replacing a photo.');
    }
    const rawPhotoId = input.photoId;
    if ((typeof rawPhotoId !== 'string' && typeof rawPhotoId !== 'bigint' && !Number.isSafeInteger(rawPhotoId)) || !/^[1-9]\d*$/.test(String(rawPhotoId))) {
      throw invalid('invalid_photo_id', 'Select the exact photo using its unrounded ID.');
    }
    return { jobId: String(rawJobId).trim(), photoId: String(rawPhotoId) };
  }

  function correction(input) {
    input = input || {};
    const selected = target(input);
    if (typeof input.expectedPath !== 'string' || !input.expectedPath.trim()) {
      throw invalid('expected_path_required', 'Reload the selected photo before replacing it.');
    }
    if (input.expectedReturnedAt != null && typeof input.expectedReturnedAt !== 'string') {
      throw invalid('invalid_return_snapshot', 'Reload the job before replacing this photo.');
    }
    if (typeof input.reason !== 'string' || !input.reason.trim()) {
      throw invalid('reason_required', 'Enter a reason for replacing this photo.');
    }
    if (!root.Blob || !(input.file instanceof root.Blob) || !Number.isFinite(input.file.size) || input.file.size <= 0) {
      throw invalid('file_required', 'Choose a nonempty replacement photo.');
    }
    return {
      jobId: selected.jobId,
      photoId: selected.photoId,
      expectedPath: input.expectedPath,
      expectedReturnedAt: input.expectedReturnedAt || '',
      reason: input.reason.trim(),
      file: input.file
    };
  }

  function validOperationId(value) {
    return typeof value === 'string' && UUID.test(value);
  }

  function newOperationId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    if (root.crypto && typeof root.crypto.getRandomValues === 'function') {
      const bytes = root.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
    throw invalid('secure_id_unavailable', 'This browser cannot create a secure correction ID.');
  }

  // Hold this object in the modal until success or Cancel. A retry reuses its
  // operation ID and original immutable inputs; an edited correction gets a new ID.
  function prepareOperation(input, previous) {
    const normalized = correction(input);
    if (previous && Object.isFrozen(previous) && validOperationId(previous.operationId) &&
        operationFields.every(field => previous[field] === normalized[field]) &&
        (!input.operationId || input.operationId === previous.operationId)) return previous;
    let operationId;
    if (!previous && input.operationId != null) {
      if (!validOperationId(input.operationId)) throw invalid('invalid_operation_id', 'The correction ID is invalid.');
      operationId = input.operationId;
    } else operationId = newOperationId();
    return Object.freeze(Object.assign(normalized, { operationId }));
  }

  function canReplace(user) {
    return !!(user && (user.is_super === true ||
      (Array.isArray(user.allowed_pages) && user.allowed_pages.includes('dispatch') &&
       Array.isArray(user.edit_pages) && user.edit_pages.includes('dispatch'))));
  }

  function canViewHistory(user) {
    return !!(user && (user.is_super === true ||
      (Array.isArray(user.allowed_pages) && Array.isArray(user.edit_pages) &&
       ['dispatch', 'completed'].some(page => user.allowed_pages.includes(page) && user.edit_pages.includes(page)))));
  }

  function createClient(options) {
    options = options || {};
    if (typeof options.url !== 'string' || !options.url.trim() || typeof options.key !== 'string' || !options.key.trim() || typeof options.token !== 'function') {
      throw invalid('client_configuration_required', 'Photo correction authentication is not configured.');
    }
    const fetchRequest = options.fetch || (root.fetch && root.fetch.bind(root));
    if (typeof fetchRequest !== 'function') throw invalid('fetch_unavailable', 'This browser cannot contact the photo service.');
    const endpoint = options.url.trim().replace(/\/+$/, '') + '/functions/v1/qa-replace-photo';

    async function request(url, method, body) {
      const token = await options.token();
      if (typeof token !== 'string' || !token.trim()) {
        throw new PhotoCorrectionError('Sign in again before correcting a photo.', { status: 401, code: 'auth_required' });
      }
      let response;
      try {
        response = await fetchRequest(url, { method, headers: { Authorization: 'Bearer ' + token, apikey: options.key }, ...(body ? { body } : {}) });
      } catch (cause) {
        throw new PhotoCorrectionError('The photo service response was lost. Retry this same correction to check its result.', {
          code: 'network_error', retryable: true, cause
        });
      }
      let payload;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new PhotoCorrectionError(response.ok ? 'The photo service returned an unreadable result. Retry this same correction.' : 'The photo service could not complete the request.', {
          status: response.status, code: response.ok ? 'invalid_response' : 'photo_service_error', retryable: response.ok || response.status >= 500, cause
        });
      }
      if (!response.ok) {
        const serverError = payload && typeof payload.error === 'object' && payload.error ? payload.error : {};
        const message = (payload && typeof payload.message === 'string' && payload.message) ||
          (typeof serverError.message === 'string' && serverError.message) ||
          (payload && typeof payload.error === 'string' && payload.error) || 'Photo correction could not be completed.';
        const code = (payload && typeof payload.code === 'string' && payload.code) ||
          (typeof serverError.code === 'string' && serverError.code) || 'photo_service_error';
        throw new PhotoCorrectionError(message, { status: response.status, code, details: payload });
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new PhotoCorrectionError('The photo service returned an invalid result. Retry this same correction.', {
          status: response.status, code: 'invalid_response', retryable: true
        });
      }
      return payload;
    }

    async function replace(input) {
      const normalized = correction(input);
      if (!validOperationId(input.operationId)) throw invalid('invalid_operation_id', 'Prepare a correction ID before saving this photo.');
      const form = new root.FormData();
      form.append('job_id', normalized.jobId);
      form.append('photo_id', normalized.photoId);
      form.append('expected_path', normalized.expectedPath);
      form.append('expected_returned_at', normalized.expectedReturnedAt);
      form.append('reason', normalized.reason);
      form.append('operation_id', input.operationId);
      form.append('file', normalized.file, normalized.file.name || 'replacement-photo');
      return request(endpoint, 'POST', form);
    }

    async function history(input) {
      const selected = target(input);
      const query = new root.URLSearchParams({ action: 'history', job_id: selected.jobId, photo_id: selected.photoId });
      return request(endpoint + '?' + query.toString(), 'GET');
    }

    return Object.freeze({ replace, submit: replace, history });
  }

  return Object.freeze({ createClient, prepareOperation, canReplace, canViewHistory, PhotoCorrectionError });
});
