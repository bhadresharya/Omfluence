/**
 * API Version Middleware
 * 
 * Extracts and validates API version from request path.
 * Sets req.apiVersion for use in routes.
 * 
 * Supported formats:
 * - /api/v1/resources
 * - /api/v2/resources
 */

const SUPPORTED_VERSIONS = ['v1']; // Add new versions here when you create them
const DEFAULT_VERSION = 'v1';

/**
 * Extract version from URL path
 * @param {string} path - Request path
 * @returns {string|null} - Version string (e.g., 'v1') or null
 */
export const extractVersion = (path) => {
  const versionMatch = path.match(/\/api\/(v\d+)\//);
  return versionMatch ? versionMatch[1] : null;
};

/**
 * Middleware to handle API versioning
 * - Extracts version from URL
 * - Validates version exists
 * - Sets default version if not specified
 * - Adds version to request object
 */
export const versionMiddleware = (req, res, next) => {
  const version = extractVersion(req.path);
  
  if (version) {
    // Version specified in URL
    if (SUPPORTED_VERSIONS.includes(version)) {
      req.apiVersion = version;
      // Add version to response header
      res.setHeader('X-API-Version', version);
      next();
    } else {
      // Unsupported version
      res.status(400).json({
        success: false,
        error: {
          status: 400,
          message: `API version "${version}" is not supported.`,
          supportedVersions: SUPPORTED_VERSIONS,
          defaultVersion: DEFAULT_VERSION
        }
      });
    }
  } else {
    // No version specified - this is a legacy/unversioned route
    // Set default version but don't block the request
    // The deprecation middleware will add warnings
    req.apiVersion = DEFAULT_VERSION;
    res.setHeader('X-API-Version', DEFAULT_VERSION);
    next();
  }
};

/**
 * Check if a version is deprecated
 * @param {string} version - Version to check
 * @returns {boolean} - True if deprecated
 */
export const isVersionDeprecated = (version) => {
  // Define deprecated versions here
  const DEPRECATED_VERSIONS = [];
  return DEPRECATED_VERSIONS.includes(version);
};

/**
 * Get sunset date for a version
 * @param {string} version - Version to check
 * @returns {string|null} - ISO date string or null
 */
export const getVersionSunset = (version) => {
  // Define sunset dates for versions
  const SUNSET_DATES = {
    // 'v1': '2027-12-31T23:59:59Z'
  };
  return SUNSET_DATES[version] || null;
};

/**
 * Middleware to add deprecation headers if version is deprecated
 * Also adds warnings for unversioned (legacy) endpoints
 */
export const deprecationMiddleware = (req, res, next) => {
  const version = req.apiVersion;
  const hasVersionInPath = extractVersion(req.path) !== null;
  
  // Check if this is an unversioned (legacy) endpoint
  if (!hasVersionInPath && req.path.startsWith('/api/')) {
    // Add deprecation warning for unversioned endpoints
    res.setHeader('Deprecation', 'true');
    res.setHeader('Warning', '299 - "Using unversioned API. Please migrate to /api/v1/ endpoints."');
    
    // Link to versioned endpoint
    const pathWithoutApi = req.path.replace(/^\/api/, '');
    const newerVersion = SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];
    res.setHeader('Link', `<${req.protocol}://${req.get('host')}/api/${newerVersion}${pathWithoutApi}>; rel="successor-version"`);
  }
  
  // Check if version is explicitly deprecated
  if (version && isVersionDeprecated(version)) {
    res.setHeader('Deprecation', 'true');
    
    const sunset = getVersionSunset(version);
    if (sunset) {
      res.setHeader('Sunset', sunset);
    }
    
    // Link to newer version
    const newerVersion = SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];
    const pathWithoutVersion = req.path.replace(/\/api\/v\d+/, '');
    res.setHeader('Link', `<${req.protocol}://${req.get('host')}/api/${newerVersion}${pathWithoutVersion}>; rel="successor-version"`);
  }
  
  next();
};

/**
 * Get all supported API versions
 * @returns {string[]} Array of supported versions
 */
export const getSupportedVersions = () => SUPPORTED_VERSIONS;

/**
 * Get the default API version
 * @returns {string} Default version
 */
export const getDefaultVersion = () => DEFAULT_VERSION;

