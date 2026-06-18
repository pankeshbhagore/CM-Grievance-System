const OpenAI = require('openai');
const Complaint = require('../models/Complaint');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Initialize lazily to allow dynamic key injection if needed
let openai;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
      console.warn("OpenAI could not be initialized.");
    }
  }
  return openai;
}

exports.generatePressRelease = asyncHandler(async (req, res) => {
  const aiClient = getOpenAI();
  if (!aiClient) {
    return res.json({
      success: false,
      report: "OpenAI API key is not configured. Please add it to the .env file and restart the backend server."
    });
  }

  // Get resolved complaints from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const resolvedComplaints = await Complaint.find({
    status: 'resolved',
    resolvedAt: { $gte: sevenDaysAgo }
  }).populate('department', 'name').populate('assignedTo', 'name');

  if (resolvedComplaints.length === 0) {
    return res.json({
      success: true,
      report: "No complaints were resolved in the past 7 days to generate a report."
    });
  }

  // Summarize data for prompt
  const summaryData = resolvedComplaints.map(c => ({
    title: c.title,
    category: c.category,
    department: c.department?.name || 'N/A',
    resolutionTime: `${c.resolutionTimeHours} hours`,
    priority: c.priority,
    officer: c.assignedTo?.name || 'Unknown'
  }));

  const prompt = `
    You are an expert Public Relations officer for the Chief Minister's Office. 
    Write a professional, positive, and inspiring weekly press release summarizing the government's 
    efforts in resolving citizen grievances over the last 7 days.

    Highlight the fastest resolutions, the critical issues solved, and praise the specific departments 
    and officers involved. Keep it around 300 words. Format it in Markdown.

    Here is the raw data of resolved complaints:
    ${JSON.stringify(summaryData, null, 2)}
  `;

  try {
    const response = await aiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert PR writer for the Chief Minister of Delhi.' },
      { role: 'user', content: prompt }
    ],
      temperature: 0.7,
    });

    const report = response.choices[0].message.content;

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw new AppError('Failed to generate press release from OpenAI', 500);
  }
});
