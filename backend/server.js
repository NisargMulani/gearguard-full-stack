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
      return res.status(400).json({ message: error.message });
    }
    
    // Update the profile with the role (the trigger creates the profile, but we need to set the role)
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: userRole })
        .eq('id', data.user.id);
      
      if (profileError) {
        console.error('Error updating profile role:', profileError);
        // Don't fail the signup, just log the error
      }
    }
    
    res.json({ 
      message: "Signup successful! Please check your email to verify your account.",
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
    const [categories, departments, locations, teams, users] = await Promise.all([
      supabase.from('equipment_categories').select('id, name').order('name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('profiles').select('id, name, role').order('name')
    ]);
    
    res.json({
      categories: categories.data || [],
      departments: departments.data || [],
      locations: locations.data || [],
      teams: teams.data || [],
      users: users.data || []
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

app.post('/api/equipment', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { data, error } = await supabase
      .from('equipment')
      .insert({
        name: req.body.name,
        serial_number: req.body.serial_number || null,
        category_id: req.body.category_id || null,
        used_by_type: req.body.used_by_type || 'EMPLOYEE',
        used_by_user_id: req.body.used_by_user_id || null,
        used_by_department_id: req.body.used_by_department_id || null,
        maintenance_team_id: req.body.maintenance_team_id || null,
        default_technician_id: req.body.default_technician_id || null,
        location_id: req.body.location_id || null,
        assigned_date: req.body.assigned_date || null,
        scrap_date: req.body.scrap_date || null,
        purchase_date: req.body.purchase_date || null,
        warranty_end_date: req.body.warranty_end_date || null,
        description: req.body.description || null,
        company: 'My Company'
      })
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

app.put('/api/equipment/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .update(req.body)
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

app.delete('/api/equipment/:id', async (req, res) => {
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

app.get('/api/requests', async (req, res) => {
  try {
    const { data: requests, error } = await supabase
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
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    const formatted = requests.map(req => ({
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

app.get('/api/requests/:id/details', async (req, res) => {
  try {
    const id = req.params.id;
    
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

app.post('/api/requests', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    let scheduledAt = req.body.scheduled_at;
    if (scheduledAt && !scheduledAt.includes('T')) {
      scheduledAt = scheduledAt.replace(' ', 'T') + 'Z';
    }
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        subject: req.body.subject,
        created_by_user_id: req.body.created_by_user_id || user.id,
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

app.put('/api/requests/:id/stage', async (req, res) => {
  try {
    const id = req.params.id;
    
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
    const user = await getUserFromRequest(req);
    if (user) {
      await supabase.from('request_stage_history').insert({
        request_id: parseInt(id),
        from_stage: current?.stage || null,
        to_stage: req.body.stage,
        changed_by_user_id: user.id
      });
    }
    
    res.json({ message: "Stage updated", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests/:id/notes', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const id = req.params.id;
    const { data, error } = await supabase
      .from('request_notes')
      .insert({
        request_id: parseInt(id),
        note: req.body.note,
        created_by_user_id: user.id
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

app.post('/api/requests/:id/instructions', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const id = req.params.id;
    const { data, error } = await supabase
      .from('request_instructions')
      .insert({
        request_id: parseInt(id),
        instruction: req.body.instruction,
        created_by_user_id: user.id
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

app.post('/api/requests/:id/worksheet', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const id = req.params.id;
    const { data, error } = await supabase
      .from('request_worksheet_comments')
      .insert({
        request_id: parseInt(id),
        comment: req.body.comment,
        created_by_user_id: user.id
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

// =========================================================
// WORKCENTERS ROUTES
// =========================================================

app.get('/api/workcenters', async (req, res) => {
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

// =========================================================
// TEAMS ROUTES
// =========================================================

app.get('/api/teams', async (req, res) => {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GearGuard API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GearGuard Backend API running on http://localhost:${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
});

