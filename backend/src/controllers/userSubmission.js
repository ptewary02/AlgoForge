const Problem = require("../models/problem");
const Submission = require("../models/submission");
const { runAllTestCases } = require("../utils/problemUtility");

const runCode = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;
    let { code, language } = req.body;

    if (!userId || !code || !problemId || !language)
      return res.status(400).send("Some field missing");

    if (language === "cpp") language = "c++";

    const problem = await Problem.findById(problemId);
    const results = await runAllTestCases(code, language, problem.visibleTestCases);

    const passed = results.filter(r => r.passed).length;
    const runtime = results.reduce((s, r) => s + parseFloat(r.cpuTime || 0), 0);
    const memory = Math.max(...results.map(r => parseFloat(r.memory || 0)));

    res.status(200).json({
      success: results.every(r => r.passed),
      testCases: results,
      passedTestCases: passed,
      totalTestCases: results.length,
      runtime,
      memory,
    });
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
};

const submitCode = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;
    let { code, language } = req.body;

    if (!userId || !code || !problemId || !language)
      return res.status(400).send("Some field missing");

    if (language === "cpp") language = "c++";

    const problem = await Problem.findById(problemId);

    const submission = await Submission.create({
      userId,
      problemId,
      code,
      language,
      status: "pending",
      testCasesTotal: problem.hiddenTestCases.length,
    });

    const results = await runAllTestCases(code, language, problem.hiddenTestCases);

    const testCasesPassed = results.filter(r => r.passed).length;
    const runtime = results.reduce((s, r) => s + parseFloat(r.cpuTime || 0), 0);
    const memory = Math.max(...results.map(r => parseFloat(r.memory || 0)));
    const allPassed = testCasesPassed === results.length;
    const status = allPassed ? "accepted" : results.some(r => r.error) ? "error" : "wrong";
    const errorMessage = allPassed ? null : results.find(r => !r.passed)?.error ?? "Wrong answer";

    submission.status = status;
    submission.testCasesPassed = testCasesPassed;
    submission.errorMessage = errorMessage;
    submission.runtime = runtime;
    submission.memory = memory;
    await submission.save();

    if (allPassed && !req.result.problemSolved.includes(problemId)) {
      req.result.problemSolved.push(problemId);
      await req.result.save();
    }

    res.status(201).json({
      accepted: allPassed,
      totalTestCases: results.length,
      passedTestCases: testCasesPassed,
      runtime,
      memory,
      errorMessage,
    });
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
};

module.exports = { submitCode, runCode };