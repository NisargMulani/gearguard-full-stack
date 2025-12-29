import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Supabase admin client (with service role key if available)
// This bypasses RLS and should be used for server-side operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Helper function to get user from Authorization header
async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return null;
  return user;
}

// Helper function to get user profile with role
async function getUserProfile(req) {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) return null;
  
  return {
    ...user,
    role: profile.role,
    name: profile.name
  };
}

// Permission check functions based on role matrix
function hasPermission(userProfile, action) {
  if (!userProfile || !userProfile.role) return false;
  
  const role = userProfile.role;
  
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

// Middleware to check permissions
function requirePermission(action) {
  return async (req, res, next) => {
    const userProfile = await getUserProfile(req);
    
    if (!userProfile) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!hasPermission(userProfile, action)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }
    
    req.userProfile = userProfile;
    next();
  };
}

// Middleware to check if user can access own resource or all resources
function requireRequestAccess() {
  return async (req, res, next) => {
    const userProfile = await getUserProfile(req);
    
    if (!userProfile) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // ADMIN and MANAGER can view all
    if (hasPermission(userProfile, 'view_all_requests')) {
      req.userProfile = userProfile;
      req.canViewAll = true;
      return next();
    }
    
    // Others can only view own
    if (hasPermission(userProfile, 'view_own_requests')) {
      req.userProfile = userProfile;
      req.canViewAll = false;
      return next();
    }
    
    return res.status(403).json({ message: "You don't have permission to view requests" });
  };
}

// Helper function to get authenticated Supabase client with user's token
function getAuthenticatedClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return supabase; // Return default client if no auth
  }
  
  const token = authHeader.split('Bearer ')[1];
  // Create a new client with the user's access token
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false
      }
    }
  );
  return client;
}

// =========================================================
// AUTHENTICATION ROUTES
// =========================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // If user exists but email is not confirmed, try to handle it
      if (error.message && (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('not confirmed') ||
        error.message.toLowerCase().includes('email_not_confirmed')
      )) {
        // If email verification is disabled in Supabase, we can try to confirm the user
        // using admin client if available
        if (supabaseAdmin) {
          try {
            // Get the user by email using admin client
            const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (!listError && users) {
              const user = users.users.find(u => u.email === email);
              if (user && !user.email_confirmed_at) {
                // Confirm the user
                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                  email_confirm: true
                });
                // Try login again
                const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                if (!retryError && retryData) {
                  // Get user profile
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', retryData.user.id)
                    .single();
                  
                  if (profileError) {
                    return res.status(400).json({ message: profileError.message });
                  }
                  
                  return res.json({
                    user: {
                      id: retryData.user.id,
                      email: retryData.user.email,
                      name: profile.name,
                      role: profile.role
                    },
                    session: retryData.session
                  });
                }
              }
            }
          } catch (adminError) {
            console.error('Error confirming user:', adminError);
          }
        }
        return res.status(400).json({ 
          message: "Your email is not confirmed. Please check your email for a verification link, or contact support."
        });
      }
      
      return res.status(400).json({ message: error.message });
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      return res.status(400).json({ message: profileError.message });
    }
    
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role
      },
      session: data.session
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'EMPLOYEE'];
    const userRole = validRoles.includes(role) ? role : 'EMPLOYEE';
    
    // Get the frontend URL for the redirect
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: userRole
        },
        emailRedirectTo: `${frontendUrl}/verify-email`
      }
    });
    
    if (error) {
      // If user already exists, provide helpful message
      if (error.message && (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('user already registered')
      )) {
        // If email verification is disabled, user should be able to login
        // If admin client is available, try to confirm existing unconfirmed user
        if (supabaseAdmin) {
          try {
            const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (!listError && users) {
              const user = users.users.find(u => u.email === email);
              if (user && !user.email_confirmed_at) {
                // Confirm the existing user
                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                  email_confirm: true
                });
                return res.status(400).json({ 
                  message: "User already exists. Your account has been activated. Please try logging in."
                });
              }
            }
          } catch (adminError) {
            console.error('Error confirming existing user:', adminError);
          }
        }
        
        return res.status(400).json({ 
          message: "User already exists. Please try logging in instead."
        });
      }
      
      return res.status(400).json({ message: error.message });
    }
    
    // Update the profile with the role (the trigger creates the profile, but we need to set the role)
    if (data.user) {
      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Always use admin client if available to bypass RLS and ensure role is set correctly
      if (supabaseAdmin) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ role: userRole })
          .eq('id', data.user.id);
        
        if (profileError) {
          console.error('Error updating profile role with admin client:', profileError);
          return res.status(500).json({ 
            message: "User created but failed to set role. Please contact support." 
          });
        }
        console.log(`Profile role set to ${userRole} for user ${data.user.id}`);
      } else {
        // Fallback to regular client (may fail due to RLS)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: userRole })
          .eq('id', data.user.id);
        
        if (profileError) {
          console.error('Error updating profile role (admin client not available):', profileError);
          console.warn('SUPABASE_SERVICE_ROLE_KEY not set. Profile role may default to EMPLOYEE.');
          console.warn('Please add SUPABASE_SERVICE_ROLE_KEY to .env file to ensure roles are set correctly.');
        }
      }
      
      // If email verification is disabled and admin client is available, confirm the user immediately
      if (supabaseAdmin && !data.user.email_confirmed_at) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
            email_confirm: true
          });
        } catch (confirmError) {
          console.error('Error confirming new user:', confirmError);
        }
      }
    }
    
    res.json({ 
      message: "Signup successful! You can now log in.",
      email: data.user?.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token, type } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }
    
    // Verify the email using the token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type || 'email'
    });
    
    if (error) {
      // Try alternative verification method
      const { data: altData, error: altError } = await supabase.auth.verifyOtp({
        token,
        type: 'email'
      });
      
      if (altError) {
        return res.status(400).json({ message: altError.message || "Invalid or expired verification token" });
      }
      
      return res.json({ 
        message: "Email verified successfully!",
        user: altData.user
      });
    }
    
    res.json({ 
      message: "Email verified successfully!",
      user: data.user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${frontendUrl}/verify-email`
      }
    });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Verification email sent! Please check your inbox." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// DASHBOARD ROUTES
// =========================================================

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select('stage, scheduled_at, request_date');
    
    const openRequests = (requests || []).filter(r => 
      ['NEW_REQUEST', 'IN_PROGRESS'].includes(r.stage)
    ).length;
    
    const overdueRequests = (requests || []).filter(r => {
      if (!r.scheduled_at || r.stage === 'REPAIRED' || r.stage === 'SCRAP') return false;
      return new Date(r.scheduled_at) < new Date();
    }).length;
    
    const { data: techRequests } = await supabase
      .from('maintenance_requests')
      .select('technician_id')
      .in('stage', ['NEW_REQUEST', 'IN_PROGRESS'])
      .not('technician_id', 'is', null);
    
    const techCount = new Set((techRequests || []).map(r => r.technician_id)).size;
    const { data: totalTechs } = await supabase.from('profiles').select('id').eq('role', 'TECHNICIAN');
    const techLoad = totalTechs && totalTechs.length > 0 
      ? Math.round((techCount / totalTechs.length) * 100) 
      : 0;
    
    res.json({
      critical_equipment: 0,
      technician_load_percent: techLoad,
      open_requests: openRequests,
      overdue_requests: overdueRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/dashboard/recent-requests', async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('maintenance_requests')
      .select(`
        id,
        subject,
        stage,
        company,
        created_by:profiles(name),
        technician:profiles(name),
        category:equipment_categories(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    const formatted = (requests || []).map(req => ({
      id: req.id,
      subject: req.subject,
      employee: req.created_by?.name || null,
      technician: req.technician?.name || null,
      category: req.category?.name || null,
      stage: req.stage,
      company: req.company
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// EQUIPMENT ROUTES
// =========================================================

app.get('/api/equipment', async (req, res) => {
  try {
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        *,
        category:equipment_categories(name),
        used_by_user:profiles(id, name),
        used_by_department:departments(id, name),
        default_technician:profiles(id, name),
        location:locations(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    const formatted = equipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      serial_number: eq.serial_number,
      employee: eq.used_by_type === 'EMPLOYEE' ? eq.used_by_user?.name : null,
      department: eq.used_by_type === 'DEPARTMENT' ? eq.used_by_department?.name : null,
      technician: eq.default_technician?.name || null,
      category: eq.category?.name || null,
      company: eq.company,
      ...eq
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/equipment/meta', async (req, res) => {
  try {
    // Use admin client for workcenters if available to bypass RLS, otherwise use authenticated client
    let workcentersClient = supabaseAdmin;
    if (!workcentersClient) {
      workcentersClient = getAuthenticatedClient(req);
    }
    if (!workcentersClient) {
      workcentersClient = supabase;
    }
    
    const [categories, departments, locations, teams, users, workcenters] = await Promise.all([
      supabase.from('equipment_categories').select('id, name').order('name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('profiles').select('id, name, role').order('name'),
      workcentersClient.from('workcenters').select('id, name').order('name')
    ]);
    
    // Log workcenters query result for debugging
    if (workcenters.error) {
      console.error('Error fetching workcenters:', workcenters.error);
    }
    
    res.json({
      categories: categories.data || [],
      departments: departments.data || [],
      locations: locations.data || [],
      teams: teams.data || [],
      users: users.data || [],
      workcenters: workcenters.data || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/equipment/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/equipment', requirePermission('manage_equipment'), async (req, res) => {
  try {
    const usedByType = req.body.used_by_type || 'EMPLOYEE';
    const usedByUserId = req.body.used_by_user_id || null;
    const usedByDepartmentId = req.body.used_by_department_id || null;

    // Validate used_by constraints to avoid DB check constraint failure
    if (usedByType === 'EMPLOYEE' && !usedByUserId) {
      return res.status(400).json({ message: "Employee is required when 'Used By' is Employee" });
    }
    if (usedByType === 'DEPARTMENT' && !usedByDepartmentId) {
      return res.status(400).json({ message: "Department is required when 'Used By' is Department" });
    }

    // Build insert object, only including workcenter_id if the column exists
    const insertData = {
      name: req.body.name,
      serial_number: req.body.serial_number || null,
      category_id: req.body.category_id || null,
      used_by_type: usedByType,
      used_by_user_id: usedByType === 'EMPLOYEE' ? usedByUserId : null,
      used_by_department_id: usedByType === 'DEPARTMENT' ? usedByDepartmentId : null,
      maintenance_team_id: req.body.maintenance_team_id || null,
      default_technician_id: req.body.default_technician_id || null,
      location_id: req.body.location_id || null,
      assigned_date: req.body.assigned_date || null,
      scrap_date: req.body.scrap_date || null,
      purchase_date: req.body.purchase_date || null,
      warranty_end_date: req.body.warranty_end_date || null,
      description: req.body.description || null,
      company: 'My Company'
    };
    
    // Only add workcenter_id if provided (column may not exist in schema)
    // Uncomment the line below after adding workcenter_id column to equipment table
    // if (req.body.workcenter_id) {
    //   insertData.workcenter_id = req.body.workcenter_id;
    // }
    
    const { data, error } = await supabase
      .from('equipment')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Equipment created", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/equipment/:id', requirePermission('manage_equipment'), async (req, res) => {
  try {
    const usedByType = req.body.used_by_type || 'EMPLOYEE';
    const usedByUserId = req.body.used_by_user_id || null;
    const usedByDepartmentId = req.body.used_by_department_id || null;

    // Validate used_by constraints to avoid DB check constraint failure
    if (usedByType === 'EMPLOYEE' && !usedByUserId) {
      return res.status(400).json({ message: "Employee is required when 'Used By' is Employee" });
    }
    if (usedByType === 'DEPARTMENT' && !usedByDepartmentId) {
      return res.status(400).json({ message: "Department is required when 'Used By' is Department" });
    }

    // Remove workcenter_id until the column is added to the equipment table
    const updateData = { ...req.body };
    delete updateData.workcenter_id;
    updateData.used_by_type = usedByType;
    updateData.used_by_user_id = usedByType === 'EMPLOYEE' ? usedByUserId : null;
    updateData.used_by_department_id = usedByType === 'DEPARTMENT' ? usedByDepartmentId : null;
    
    const { data, error } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Updated", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/equipment/:id', requirePermission('manage_equipment'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', req.params.id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// MAINTENANCE REQUESTS ROUTES
// =========================================================

app.get('/api/requests', requireRequestAccess(), async (req, res) => {
  try {
    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        created_by:profiles(id, name),
        equipment:equipment(id, name, serial_number),
        workcenter:workcenters(id, name),
        category:equipment_categories(name),
        technician:profiles(id, name),
        team:teams(name)
      `);
    
    // Filter by user if they can't view all
    if (!req.canViewAll) {
      // TECHNICIAN can only see assigned requests, EMPLOYEE can only see own requests
      if (req.userProfile.role === 'TECHNICIAN') {
        query = query.eq('technician_id', req.userProfile.id);
      } else if (req.userProfile.role === 'EMPLOYEE') {
        query = query.eq('created_by_user_id', req.userProfile.id);
      }
    }
    
    const { data: requests, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    const formatted = (requests || []).map(req => ({
      id: req.id,
      subject: req.subject,
      scheduled_at: req.scheduled_at,
      stage: req.stage,
      maintenance_for: req.maintenance_for,
      employee: req.created_by?.name || null,
      technician: req.technician?.name || null,
      category: req.category?.name || null,
      company: req.company,
      ...req
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/requests/meta', async (req, res) => {
  try {
    const [equipment, workcenters, teams, techs, categories] = await Promise.all([
      supabase.from('equipment').select('id, name, serial_number').order('name'),
      supabase.from('workcenters').select('id, name').order('name'),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('profiles').select('id, name').eq('role', 'TECHNICIAN').order('name'),
      supabase.from('equipment_categories').select('id, name').order('name')
    ]);
    
    res.json({
      equipment: equipment.data || [],
      workcenters: workcenters.data || [],
      teams: teams.data || [],
      techs: techs.data || [],
      categories: categories.data || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/requests/:id/details', requireRequestAccess(), async (req, res) => {
  try {
    const id = req.params.id;
    const userProfile = req.userProfile;
    
    // Check if user can access this request
    const { data: requestData, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('created_by_user_id, technician_id')
      .eq('id', id)
      .single();
    
    if (requestError) {
      return res.status(400).json({ message: requestError.message });
    }
    
    // Check access permissions
    if (!req.canViewAll) {
      if (userProfile.role === 'TECHNICIAN' && requestData.technician_id !== userProfile.id) {
        return res.status(403).json({ message: "You can only view requests assigned to you" });
      }
      if (userProfile.role === 'EMPLOYEE' && requestData.created_by_user_id !== userProfile.id) {
        return res.status(403).json({ message: "You can only view your own requests" });
      }
    }
    
    const [request, notes, instructions, worksheet] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select(`
          *,
          created_by:profiles(id, name),
          equipment:equipment(id, name, serial_number),
          workcenter:workcenters(id, name),
          category:equipment_categories(name),
          technician:profiles(id, name),
          team:teams(name)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('request_notes')
        .select('*, created_by:profiles(id, name)')
        .eq('request_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('request_instructions')
        .select('*, created_by:profiles(id, name)')
        .eq('request_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('request_worksheet_comments')
        .select('*, created_by:profiles(id, name)')
        .eq('request_id', id)
        .order('created_at', { ascending: false })
    ]);
    
    if (request.error) {
      return res.status(400).json({ message: request.error.message });
    }
    
    res.json({
      request: request.data,
      notes: (notes.data || []).map(n => ({
        id: n.id,
        note: n.note,
        created_at: new Date(n.created_at).toLocaleString(),
        created_by: n.created_by?.name
      })),
      instructions: (instructions.data || []).map(i => ({
        id: i.id,
        instruction: i.instruction,
        created_at: new Date(i.created_at).toLocaleString(),
        created_by: i.created_by?.name
      })),
      worksheet: (worksheet.data || []).map(w => ({
        id: w.id,
        comment: w.comment,
        created_at: new Date(w.created_at).toLocaleString(),
        created_by: w.created_by?.name
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests', requirePermission('create_request'), async (req, res) => {
  try {
    
    let scheduledAt = req.body.scheduled_at;
    if (scheduledAt && !scheduledAt.includes('T')) {
      scheduledAt = scheduledAt.replace(' ', 'T') + 'Z';
    }
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        subject: req.body.subject,
        created_by_user_id: req.body.created_by_user_id || req.userProfile.id,
        maintenance_for: req.body.maintenance_for || 'EQUIPMENT',
        equipment_id: req.body.equipment_id || null,
        workcenter_id: req.body.workcenter_id || null,
        category_id: req.body.category_id || null,
        request_date: req.body.request_date || new Date().toISOString().split('T')[0],
        maintenance_type: req.body.maintenance_type || 'CORRECTIVE',
        team_id: req.body.team_id || null,
        technician_id: req.body.technician_id || null,
        scheduled_at: scheduledAt || null,
        duration_minutes: req.body.duration_minutes || 0,
        priority: req.body.priority || 2,
        stage: req.body.stage || 'NEW_REQUEST',
        blocked: req.body.blocked || false,
        company: 'My Company'
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Request created", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/requests/:id/stage', requirePermission('update_request_stage'), async (req, res) => {
  try {
    const id = req.params.id;
    const userProfile = req.userProfile;
    
    // Check if TECHNICIAN can only update assigned requests
    if (userProfile.role === 'TECHNICIAN') {
      const { data: request } = await supabase
        .from('maintenance_requests')
        .select('technician_id')
        .eq('id', id)
        .single();
      
      if (!request || request.technician_id !== userProfile.id) {
        return res.status(403).json({ message: "You can only update requests assigned to you" });
      }
    }
    
    const { data: current } = await supabase
      .from('maintenance_requests')
      .select('stage')
      .eq('id', id)
      .single();
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({
        stage: req.body.stage,
        blocked: req.body.blocked
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Record stage history
    await supabase.from('request_stage_history').insert({
      request_id: parseInt(id),
      from_stage: current?.stage || null,
      to_stage: req.body.stage,
      changed_by_user_id: userProfile.id
    });
    
    res.json({ message: "Stage updated", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests/:id/notes', requirePermission('add_notes'), async (req, res) => {
  try {
    const id = req.params.id;
    const userProfile = req.userProfile;
    
    // EMPLOYEE can only add notes to their own requests
    if (userProfile.role === 'EMPLOYEE') {
      const { data: request } = await supabase
        .from('maintenance_requests')
        .select('created_by_user_id')
        .eq('id', id)
        .single();
      
      if (!request || request.created_by_user_id !== userProfile.id) {
        return res.status(403).json({ message: "You can only add notes to your own requests" });
      }
    }
    
    const { data, error } = await supabase
      .from('request_notes')
      .insert({
        request_id: parseInt(id),
        note: req.body.note,
        created_by_user_id: userProfile.id
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Note added", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests/:id/instructions', requirePermission('add_instructions'), async (req, res) => {
  try {
    const id = req.params.id;
    const userProfile = req.userProfile;
    
    const { data, error } = await supabase
      .from('request_instructions')
      .insert({
        request_id: parseInt(id),
        instruction: req.body.instruction,
        created_by_user_id: userProfile.id
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Instruction added", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests/:id/worksheet', requirePermission('add_worksheet'), async (req, res) => {
  try {
    const id = req.params.id;
    const userProfile = req.userProfile;
    
    const { data, error } = await supabase
      .from('request_worksheet_comments')
      .insert({
        request_id: parseInt(id),
        comment: req.body.comment,
        created_by_user_id: userProfile.id
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Worksheet comment added", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/requests/:id', requirePermission('delete_request'), async (req, res) => {
  try {
    const id = req.params.id;
    
    const { error } = await supabase
      .from('maintenance_requests')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// WORKCENTERS ROUTES
// =========================================================

app.get('/api/workcenters', requirePermission('manage_workcenters'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workcenters')
      .select('*')
      .order('name');
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/workcenters', requirePermission('manage_workcenters'), async (req, res) => {
  try {
    const { name, code, tag, alternative_workcenters, cost_per_hour, capacity, time_efficiency, oee_target } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Work center name is required" });
    }
    
    // Use admin client if available (bypasses RLS), otherwise use authenticated client
    const dbClient = supabaseAdmin || getAuthenticatedClient(req);
    
    const { data: workcenterData, error: workcenterError } = await dbClient
      .from('workcenters')
      .insert({
        name: name.trim(),
        code: code?.trim() || null,
        tag: tag?.trim() || null,
        alternative_workcenters: alternative_workcenters?.trim() || null,
        cost_per_hour: cost_per_hour ? Number(cost_per_hour) : null,
        capacity: capacity ? Number(capacity) : null,
        time_efficiency: time_efficiency ? Number(time_efficiency) : null,
        oee_target: oee_target ? Number(oee_target) : null
      })
      .select();
    
    if (workcenterError) {
      return res.status(400).json({ message: workcenterError.message });
    }
    
    if (!workcenterData || workcenterData.length === 0) {
      return res.status(400).json({ message: "Failed to create work center" });
    }
    
    const workcenter = workcenterData[0];
    
    res.json({ message: "Work center created successfully", data: workcenter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// TEAMS ROUTES
// =========================================================

app.get('/api/teams', requirePermission('manage_teams'), async (req, res) => {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          user:profiles(id, name)
        )
      `)
      .order('name');
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    const formatted = (teams || []).map(team => ({
      id: team.id,
      name: team.name,
      company: team.company,
      members: (team.members || [])
        .map(m => m.user?.name)
        .filter(Boolean)
        .join(', ') || 'No members'
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/teams/meta', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .order('name');
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({
      users: users || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/teams', requirePermission('manage_teams'), async (req, res) => {
  try {
    // Use admin client if available (bypasses RLS), otherwise use authenticated client
    const dbClient = supabaseAdmin || getAuthenticatedClient(req);
    
    const { name, company, member_ids } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }
    
    // Create the team
    const { data: teamData, error: teamError } = await dbClient
      .from('teams')
      .insert({
        name: name.trim(),
        company: company || 'My Company'
      })
      .select();
    
    if (teamError) {
      return res.status(400).json({ message: teamError.message });
    }
    
    if (!teamData || teamData.length === 0) {
      return res.status(400).json({ message: "Failed to create team" });
    }
    
    const team = teamData[0];
    
    // Add team members if provided
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const membersToInsert = member_ids
        .filter(id => id != null && id !== '' && String(id).trim() !== '') // Remove null, undefined, empty strings
        .map(user_id => {
          // user_id is likely a UUID (string) from profiles table
          const userId = String(user_id).trim();
          
          // Validate: must not be empty after trimming
          if (userId === '') {
            return null;
          }
          
          return {
            team_id: team.id,
            user_id: userId
          };
        })
        .filter(member => member !== null && member.user_id != null); // Remove any null entries
      
      if (membersToInsert.length > 0) {
        const { error: membersError } = await dbClient
          .from('team_members')
          .insert(membersToInsert);
        
        if (membersError) {
          // Team was created but members failed - log but don't fail the request
          console.error('Error adding team members:', membersError);
          console.error('Members attempted to insert:', membersToInsert);
        }
      }
    }
    
    res.json({ message: "Team created successfully", data: team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================
// USER MANAGEMENT ROUTES
// =========================================================

app.put('/api/users/:id/role', requirePermission('change_user_roles'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be one of: ADMIN, MANAGER, TECHNICIAN, EMPLOYEE" });
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: "User role updated", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users', requirePermission('change_user_roles'), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .order('name');
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(users || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GearGuard API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GearGuard Backend API running on http://localhost:${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
});

