use crate::types::{DashboardState, TestRun, TestResult, ProviderMetrics, CoverageData};
use anyhow::Result;
use tokio::fs;
use tokio::io::AsyncReadExt;

pub struct StateProvider;

impl StateProvider {
    pub async fn load_from_json(path: &str) -> Result<DashboardState> {
        let mut file = fs::File::open(path).await?;
        let mut contents = Vec::new();
        file.read_to_end(&mut contents).await?;

        Ok(serde_json::from_slice(&contents)?)
    }

    pub async fn save_to_json(state: &DashboardState, path: &str) -> Result<()> {
        let contents = serde_json::to_string_pretty(state)?;
        fs::write(path, contents).await?;
        Ok(())
    }

    pub fn calculate_provider_metrics(test_runs: &[TestRun]) -> Vec<ProviderMetrics> {
        let mut metrics_map: std::collections::HashMap<String, Vec<&TestResult>> = std::collections::HashMap::new();

        for run in test_runs {
            for result in &run.results {
                metrics_map
                    .entry(result.provider.clone())
                    .or_insert_with(Vec::new)
                    .push(result);
            }
        }

        metrics_map
            .into_iter()
            .map(|(provider, results)| {
                let total_runs = results.len() as u64;
                let successful_runs = results
                    .iter()
                    .filter(|r| matches!(r.status, crate::types::TestStatus::Passed))
                    .count() as u64;
                let total_duration: u64 = results.iter().map(|r| r.duration).sum();
                let average_duration = if total_runs > 0 {
                    total_duration as f64 / total_runs as f64
                } else {
                    0.0
                };
                let success_rate = if total_runs > 0 {
                    successful_runs as f64 / total_runs as f64 * 100.0
                } else {
                    0.0
                };

                ProviderMetrics {
                    name: provider,
                    total_runs,
                    successful_runs,
                    average_duration,
                    success_rate,
                }
            })
            .collect()
    }

    pub fn calculate_test_run_summary(test_run: &TestRun) -> (usize, usize, usize, usize) {
        let passed = test_run.results.iter().filter(|r| matches!(r.status, crate::types::TestStatus::Passed)).count();
        let failed = test_run.results.iter().filter(|r| matches!(r.status, crate::types::TestStatus::Failed)).count();
        let flaky = test_run.results.iter().filter(|r| matches!(r.status, crate::types::TestStatus::Flaky)).count();
        let skipped = test_run.results.iter().filter(|r| matches!(r.status, crate::types::TestStatus::Skipped)).count();

        (passed, failed, flaky, skipped)
    }
}
