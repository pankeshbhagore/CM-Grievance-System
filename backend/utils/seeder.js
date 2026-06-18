require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const { Counter } = require('../models/Counter');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cm_grievance';

const departments = [
  { name: 'Roads & Infrastructure', code: 'ROADS', complaintCategories: ['roads_potholes', 'drainage'], slaHours: 48, mcd311DeptId: 'MCD001', contactEmail: 'roads@delhi.gov.in', contactPhone: '011-23456789' },
  { name: 'Water Supply Board', code: 'WATER', complaintCategories: ['water_supply', 'sewage'], slaHours: 24, mcd311DeptId: 'MCD002', contactEmail: 'water@delhi.gov.in', contactPhone: '011-23456780' },
  { name: 'Sanitation & Waste', code: 'SANIT', complaintCategories: ['garbage_sanitation'], slaHours: 24, mcd311DeptId: 'MCD003', contactEmail: 'sanitation@delhi.gov.in', contactPhone: '011-23456781' },
  { name: 'Electricity Department', code: 'ELEC', complaintCategories: ['electricity', 'street_lights'], slaHours: 12, mcd311DeptId: 'MCD004', contactEmail: 'electricity@delhi.gov.in', contactPhone: '011-23456782' },
  { name: 'Traffic Management', code: 'TRAFFIC', complaintCategories: ['traffic'], slaHours: 48, mcd311DeptId: 'MCD005', contactEmail: 'traffic@delhi.gov.in', contactPhone: '011-23456783' },
  { name: 'Environment & Pollution', code: 'ENV', complaintCategories: ['pollution', 'noise_complaint'], slaHours: 72, mcd311DeptId: 'MCD006', contactEmail: 'env@delhi.gov.in', contactPhone: '011-23456784' },
  { name: 'Parks & Recreation', code: 'PARKS', complaintCategories: ['park_maintenance'], slaHours: 96, mcd311DeptId: 'MCD007', contactEmail: 'parks@delhi.gov.in', contactPhone: '011-23456785' },
  { name: 'Building & Construction', code: 'BUILD', complaintCategories: ['building_safety', 'encroachment'], slaHours: 24, mcd311DeptId: 'MCD008', contactEmail: 'building@delhi.gov.in', contactPhone: '011-23456786' },
];

const DELHI_COORDS = [
  [77.2090, 28.6139], [77.2295, 28.6304], [77.1025, 28.7041],
  [77.3910, 28.5921], [77.2167, 28.5502], [77.0858, 28.6692],
  [77.3099, 28.5355], [77.2800, 28.6500], [77.1500, 28.7200]
];

const complaintTemplates = [
  { title: 'Large pothole on main road causing accidents', description: 'There is a massive pothole near Rajiv Chowk metro station causing multiple accidents daily. Urgent repair needed.', category: 'roads_potholes', priority: 'high', ward: 'Connaught Place', district: 'New Delhi' },
  { title: 'Water supply disrupted for 3 days', description: 'No water supply in Block C, Dwarka Sector 12 for the past 3 days. Families are suffering especially during summer.', category: 'water_supply', priority: 'high', ward: 'Dwarka', district: 'South West Delhi' },
  { title: 'Garbage not collected for 2 weeks', description: 'Garbage has not been collected in our area for 2 weeks. Rotting waste is creating health hazard and foul smell.', category: 'garbage_sanitation', priority: 'medium', ward: 'Laxmi Nagar', district: 'East Delhi' },
  { title: 'CRITICAL: Sewage overflow near school causing health risk', description: 'Sewage is overflowing near Government Primary School in Okhla. Children are being exposed to raw sewage. EMERGENCY.', category: 'sewage', priority: 'critical', isCritical: true, criticalReason: 'sewage overflow school', ward: 'Okhla', district: 'South East Delhi' },
  { title: 'Street lights not working in entire sector', description: 'All 12 street lights in Sector 15 Rohini are non-functional for a month. Area becomes pitch dark after sunset, creating safety issues.', category: 'street_lights', priority: 'high', ward: 'Rohini', district: 'North West Delhi' },
  { title: 'Illegal construction blocking public road', description: 'Builder is constructing illegally on public land near Green Park extension, blocking the road completely.', category: 'encroachment', priority: 'medium', ward: 'Green Park', district: 'South Delhi' },
  { title: 'Industrial smoke causing severe pollution', description: 'A factory in Wazirpur industrial area is releasing black smoke 24x7 causing severe air pollution in residential areas nearby.', category: 'pollution', priority: 'high', ward: 'Wazirpur', district: 'North West Delhi' },
  { title: 'CRITICAL: Building showing structural cracks may collapse', description: 'Residential building at Chandni Chowk showing large cracks in walls and pillars. Residents fear collapse. Immediate inspection needed.', category: 'building_safety', priority: 'critical', isCritical: true, criticalReason: 'building collapse', ward: 'Chandni Chowk', district: 'Central Delhi' },
  { title: 'Park benches broken, playing area unsafe for children', description: 'All benches and play equipment in Central Park Sector 4 are broken and rusted, unsafe for children.', category: 'park_maintenance', priority: 'low', ward: 'Saket', district: 'South Delhi' },
  { title: 'Traffic signal malfunctioning causing daily jams', description: 'Signal at ITO crossing is stuck on red for 10+ minutes causing massive traffic jams during peak hours.', category: 'traffic', priority: 'high', ward: 'ITO', district: 'Central Delhi' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB...');

  await Promise.all([User.deleteMany(), Department.deleteMany(), Complaint.deleteMany(), Counter.deleteMany()]);
  console.log('Cleared existing data...');

  const createdDepts = await Department.insertMany(departments);
  console.log(`Created ${createdDepts.length} departments`);

  const password = await bcrypt.hash('password123', 12);

  const usersRaw = [
    { name: 'Rekha Gupta', email: 'cm@delhi.gov.in', password, role: 'cm', designation: 'Chief Minister of Delhi', isActive: true },
    { name: 'Super Admin', email: 'admin@delhi.gov.in', password, role: 'super_admin', designation: 'System Administrator', isActive: true },
    { name: 'Rajesh Kumar', email: 'dh.roads@delhi.gov.in', password, role: 'department_head', department: createdDepts[0]._id, designation: 'Head - Roads Dept', bandwidth: 20, isActive: true },
    { name: 'Sunita Sharma', email: 'dh.water@delhi.gov.in', password, role: 'department_head', department: createdDepts[1]._id, designation: 'Head - Water Board', bandwidth: 20, isActive: true },
    { name: 'Amit Singh', email: 'officer1@delhi.gov.in', password, role: 'employee', department: createdDepts[0]._id, designation: 'Junior Engineer', bandwidth: 10, isActive: true },
    { name: 'Priya Verma', email: 'officer2@delhi.gov.in', password, role: 'employee', department: createdDepts[1]._id, designation: 'Water Supply Officer', bandwidth: 10, isActive: true },
    { name: 'Mohammed Raza', email: 'officer3@delhi.gov.in', password, role: 'employee', department: createdDepts[2]._id, designation: 'Sanitation Inspector', bandwidth: 15, isActive: true },
    { name: 'Kavita Joshi', email: 'officer4@delhi.gov.in', password, role: 'employee', department: createdDepts[3]._id, designation: 'Electrical Officer', bandwidth: 12, isActive: true },
    { name: 'Rahul Gupta', email: 'citizen1@example.com', password, role: 'citizen', ward: 'Dwarka', district: 'South West Delhi', isActive: true },
    { name: 'Anjali Mehta', email: 'citizen2@example.com', password, role: 'citizen', ward: 'Rohini', district: 'North West Delhi', isActive: true },
    { name: 'Vikram Nair', email: 'citizen3@example.com', password, role: 'citizen', ward: 'Saket', district: 'South Delhi', isActive: true },
  ];
  const users = await User.insertMany(usersRaw);
  console.log(`Created ${users.length} users`);

  // Link department heads back onto their Department doc
  await Department.findByIdAndUpdate(createdDepts[0]._id, { head: users[2]._id });
  await Department.findByIdAndUpdate(createdDepts[1]._id, { head: users[3]._id });

  const citizens = users.filter((u) => u.role === 'citizen');
  const officers = users.filter((u) => u.role === 'employee');

  const statuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'pending_verification', 'resolved'];
  const complaints = [];

  for (let i = 0; i < complaintTemplates.length; i++) {
    const tmpl = complaintTemplates[i];
    const coords = DELHI_COORDS[i % DELHI_COORDS.length];
    const deptIndex = i % createdDepts.length;
    const citizen = citizens[i % citizens.length];
    const officer = officers[i % officers.length];
    const status = statuses[i % statuses.length];
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const isAssignedLike = ['assigned', 'in_progress', 'pending_verification', 'resolved'].includes(status);

    complaints.push({
      ...tmpl,
      location: { type: 'Point', coordinates: coords },
      address: `${tmpl.ward}, ${tmpl.district}, Delhi`,
      citizen: citizen._id,
      department: createdDepts[deptIndex]._id,
      status,
      assignedTo: isAssignedLike ? officer._id : undefined,
      assignedAt: isAssignedLike ? createdAt : undefined,
      resolvedAt: status === 'resolved' ? new Date(createdAt.getTime() + 48 * 3600000) : undefined,
      resolutionTimeHours: status === 'resolved' ? 48 : undefined,
      dueDate: new Date(createdAt.getTime() + 72 * 3600000),
      source: ['portal', 'mobile_app', 'social_media'][i % 3],
      aiConfidence: 0.7 + Math.random() * 0.25,
      timeline: [{ status: 'submitted', message: 'Complaint submitted', updatedBy: citizen._id, timestamp: createdAt }],
      createdAt
    });
  }

  for (let i = 10; i < 40; i++) {
    const tmpl = complaintTemplates[i % complaintTemplates.length];
    const base = DELHI_COORDS[i % DELHI_COORDS.length];
    const coords = [base[0] + (Math.random() - 0.5) * 0.02, base[1] + (Math.random() - 0.5) * 0.02];
    const createdAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    const status = statuses[i % statuses.length];
    complaints.push({
      ...tmpl,
      title: `${tmpl.title} - Area ${i}`,
      location: { type: 'Point', coordinates: coords },
      address: `Ward ${i}, Delhi`,
      citizen: citizens[i % citizens.length]._id,
      department: createdDepts[i % createdDepts.length]._id,
      status,
      dueDate: new Date(createdAt.getTime() + 72 * 3600000),
      source: 'portal',
      aiConfidence: 0.65,
      timeline: [{ status: 'submitted', message: 'Submitted', updatedBy: citizens[i % citizens.length]._id, timestamp: createdAt }],
      createdAt
    });
  }

  // Insert one-by-one through the model so pre-save hooks (atomic ticketId) run correctly
  for (const c of complaints) {
    await Complaint.create(c);
  }
  console.log(`Created ${complaints.length} complaints`);

  console.log('\n✅ SEED COMPLETE! Login credentials (password: password123):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CM:           cm@delhi.gov.in');
  console.log('Admin:        admin@delhi.gov.in');
  console.log('Dept Head:    dh.roads@delhi.gov.in');
  console.log('Officer:      officer1@delhi.gov.in');
  console.log('Citizen:      citizen1@example.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
