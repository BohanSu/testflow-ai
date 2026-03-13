mod types;
mod state;
mod ui;

use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io;
use tokio::time::{interval, Duration};
use types::{ActiveTab, DashboardState, TestRun};
use state::StateProvider;
use ui::UI;

#[tokio::main]
async fn main() -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut state = DashboardState::default();

    let mut refresh_interval = interval(Duration::from_secs(5));
    let mut running = true;

    while running {
        terminal.draw(|f| UI::draw(f, &state))?;

        tokio::select! {
            _ = refresh_interval.tick() => {
                state = refresh_state(&state).await.unwrap_or_default();
            }
            result = event::read() => {
                if let Ok(Event::Key(key)) = result {
                    match key.code {
                        KeyCode::Char('q') => {
                            running = false;
                        }
                        KeyCode::Tab => {
                            state.active_tab = match state.active_tab {
                                ActiveTab::Runs => ActiveTab::Metrics,
                                ActiveTab::Metrics => ActiveTab::Coverage,
                                ActiveTab::Coverage => ActiveTab::Runs,
                            };
                        }
                        KeyCode::Up => {
                            if state.test_runs.is_empty() {
                                continue;
                            }
                            if state.selected_run_index > 0 {
                                state.selected_run_index -= 1;
                            }
                        }
                        KeyCode::Down => {
                            if state.test_runs.is_empty() {
                                continue;
                            }
                            if state.selected_run_index < state.test_runs.len() - 1 {
                                state.selected_run_index += 1;
                            }
                        }
                        KeyCode::Char('r') => {
                            state = refresh_state(&state).await.unwrap_or_default();
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}

async fn refresh_state(current_state: &DashboardState) -> Result<DashboardState> {
    let mut new_state = current_state.clone();

    new_state.provider_metrics = StateProvider::calculate_provider_metrics(&new_state.test_runs);

    Ok(new_state)
}
