use chrono::DateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub test_name: String,
    pub status: TestStatus,
    pub duration: u64,
    pub provider: String,
    pub timestamp: DateTime<chrono::Utc>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TestStatus {
    Passed,
    Failed,
    Flaky,
    Skipped,
}

impl TestStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TestStatus::Passed => "PASSED",
            TestStatus::Failed => "FAILED",
            TestStatus::Flaky => "FLAKY",
            TestStatus::Skipped => "SKIPPED",
        }
    }

    pub fn color(&self) -> ratatui::style::Color {
        match self {
            TestStatus::Passed => ratatui::style::Color::Green,
            TestStatus::Failed => ratatui::style::Color::Red,
            TestStatus::Flaky => ratatui::style::Color::Yellow,
            TestStatus::Skipped => ratatui::style::Color::Gray,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRun {
    pub id: String,
    pub timestamp: DateTime<chrono::Utc>,
    pub results: Vec<TestResult>,
    pub total_tests: usize,
    pub passed: usize,
    pub failed: usize,
    pub flaky: usize,
    pub duration: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMetrics {
    pub name: String,
    pub total_runs: u64,
    pub successful_runs: u64,
    pub average_duration: f64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverageData {
    pub test_file: String,
    pub covered_lines: u32,
    pub total_lines: u32,
    pub coverage_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardState {
    pub test_runs: Vec<TestRun>,
    pub provider_metrics: Vec<ProviderMetrics>,
    pub coverage_data: Vec<CoverageData>,
    pub selected_run_index: usize,
    pub active_tab: ActiveTab,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveTab {
    Runs,
    Metrics,
    Coverage,
}

impl Default for DashboardState {
    fn default() -> Self {
        Self {
            test_runs: Vec::new(),
            provider_metrics: Vec::new(),
            coverage_data: Vec::new(),
            selected_run_index: 0,
            active_tab: ActiveTab::Runs,
        }
    }
}
