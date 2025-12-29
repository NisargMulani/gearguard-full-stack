// Permission utility functions based on role matrix

export function hasPermission(user, action) {
  if (!user || !user.role) return false;
  
  const role = user.role;
  
  // ADMIN has all permissions
  if (role === 'ADMIN') return true;
  
  // Permission matrix
  const permissions = {
    'view_all_requests': ['ADMIN', 'MANAGER'],
    'view_own_requests': ['ADMIN', 'MANAGER', 'TECHNICIAN', 'EMPLOYEE'],
    'create_request': ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    'update_request_stage': ['ADMIN', 'MANAGER', 'TECHNICIAN'],
    'delete_request': ['ADMIN', 'MANAGER'],
    'add_notes': ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    'add_instructions': ['ADMIN', 'MANAGER'],
    'add_worksheet': ['ADMIN'],
    'manage_equipment': ['ADMIN', 'MANAGER'],
    'manage_workcenters': ['ADMIN', 'MANAGER'],
    'manage_teams': ['ADMIN', 'MANAGER'],
    'change_user_roles': ['ADMIN']
  };
  
  const allowedRoles = permissions[action];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

// Helper to check if user can view all requests
export function canViewAllRequests(user) {
  return hasPermission(user, 'view_all_requests');
}

// Helper to check if user can manage equipment
export function canManageEquipment(user) {
  return hasPermission(user, 'manage_equipment');
}

// Helper to check if user can manage workcenters
export function canManageWorkcenters(user) {
  return hasPermission(user, 'manage_workcenters');
}

// Helper to check if user can manage teams
export function canManageTeams(user) {
  return hasPermission(user, 'manage_teams');
}

// Helper to check if user can change roles
export function canChangeUserRoles(user) {
  return hasPermission(user, 'change_user_roles');
}

