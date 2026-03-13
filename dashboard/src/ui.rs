use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, List, ListItem, Paragraph, Sparkline, Table, Wrap},
    Frame,
};

use crate::types::{DashboardState, ActiveTab, TestStatus};

pub struct UI;

impl UI {
    pub fn draw(frame: &mut Frame, state: &DashboardState) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .margin(1)
            .constraints(
                [
                    Constraint::Length(3),
                    Constraint::Min(0),
                    Constraint::Length(3),
                ]
                .as_ref(),
            )
            .split(frame.size());

        Self::draw_header(frame, chunks[0], state);
        Self::draw_content(frame, chunks[1], state);
        Self::draw_footer(frame, chunks[2], state);
    }

    fn draw_header(frame: &mut Frame, area: Rect, state: &DashboardState) {
        let title = Span::styled(
            "TestFlow AI Dashboard",
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        );

        let tabs = vec![
            "Runs",
            "Metrics",
            "Coverage",
        ];

        let tabs_spans: Vec<Span> = tabs
            .iter()
            .enumerate()
            .map(|(i, tab)| {
                let is_active = matches!(
                    state.active_tab,
                    ActiveTab::Runs if *tab == "Runs",
                    ActiveTab::Metrics if *tab == "Metrics",
                    ActiveTab::Coverage if *tab == "Coverage",
                );

                Span::styled(
                    tab,
                    Style::default()
                        .fg(if is_active { Color::Yellow } else { Color::Gray })
                        .add_modifier(if is_active { Modifier::BOLD } else { Modifier::empty() }),
                )
            })
            .collect();

        let header = Paragraph::new(Line::from(vec![title, Span::raw("   "), Span::from(tabs_spans.join(" | "))]))
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded),
            );

        frame.render_widget(header, area);
    }

    fn draw_content(frame: &mut Frame, area: Rect, state: &DashboardState) {
        match state.active_tab {
            ActiveTab::Runs => Self::draw_runs_tab(frame, area, state),
            ActiveTab::Metrics => Self::draw_metrics_tab(frame, area, state),
            ActiveTab::Coverage => Self::draw_coverage_tab(frame, area, state),
        }
    }

    fn draw_runs_tab(frame: &mut Frame, area: Rect, state: &DashboardState) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(50), Constraint::Percentage(50)].as_ref())
            .split(area);

        Self::draw_runs_list(frame, chunks[0], state);
        Self::draw_run_details(frame, chunks[1], state);
    }

    fn draw_runs_list(frame: &mut Frame, area: Rect, state: &DashboardState) {
        let runs_list: Vec<ListItem> = state
            .test_runs
            .iter()
            .enumerate()
            .map(|(i, run)| {
                let is_selected = i == state.selected_run_index;
                let status_color = if run.failed > 0 { Color::Red } else { Color::Green };
                let style = Style::default()
                    .fg(if is_selected { Color::Yellow } else { Color::White })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() });

                ListItem::new(vec![
                    Line::from(vec![
                        Span::styled(
                            format!("{} ", run.timestamp.format("%H:%M:%S")),
                            Style::default().fg(Color::Gray),
                        ),
                        Span::styled(
                            format!("#{:05} ", run.id),
                            Style::default().fg(Color::Cyan),
                        ),
                        Span::styled(
                            format!("Passed: {} ", run.passed),
                            Style::default().fg(Color::Green),
                        ),
                        Span::styled(
                            format!("Failed: {} ", run.failed),
                            Style::default().fg(Color::Red),
                        ),
                        Span::styled(
                            format!("Flaky: {} ", run.flaky),
                            Style::default().fg(Color::Yellow),
                        ),
                        Span::styled(
                            format!("({}ms)", run.duration),
                            Style::default().fg(Color::Gray),
                        ),
                    ]).style(style),
                ])
            })
            .collect();

        let list = List::new(runs_list)
            .block(
                Block::default()
                    .title(" Test Runs ")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded),
            )
            .highlight_style(Style::default().add_modifier(Modifier::REVERSED));

        frame.render_widget(list, area);
    }

    fn draw_run_details(frame: &mut Frame, area: Rect, state: &DashboardState) {
        if state.test_runs.is_empty() {
            let paragraph = Paragraph::new("No test runs available")
                .alignment(Alignment::Center)
                .block(
                    Block::default()
                        .title(" Run Details ")
                        .borders(Borders::ALL)
                        .border_type(BorderType::Rounded),
                );
            frame.render_widget(paragraph, area);
            return;
        }

        let run = &state.test_runs[state.selected_run_index];

        let test_rows: Vec<Vec<Span>> = run
            .results
            .iter()
            .map(|result| {
                vec![
                    Span::raw(result.test_name.clone()),
                    Span::raw(" "),
                    Span::styled(
                        result.provider.clone(),
                        Style::default().fg(Color::Cyan),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        result.status.as_str().to_string(),
                        Style::default().fg(result.status.color()),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        format!("{}ms", result.duration),
                        Style::default().fg(Color::Gray),
                    ),
                ]
            })
            .collect();

        let table = Table::new(test_rows)
            .header(
                vec![Line::from(vec![
                    Span::styled("Test Name", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Provider", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Status", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Duration", Style::default().fg(Color::Cyan)),
                ])]
            )
            .block(
                Block::default()
                    .title(format!(" Run Details - {} ", run.id))
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded),
            )
            .widths(&[
                Constraint::Percentage(50),
                Constraint::Percentage(15),
                Constraint::Percentage(15),
                Constraint::Percentage(20),
            ]);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .margin(1)
            .constraints(
                [
                    Constraint::Length(3),
                    Constraint::Min(0),
                ]
                .as_ref(),
            )
            .split(area);

        let summary = Paragraph::new(vec![
            Line::from(vec![
                Span::styled(
                    format!("Total Tests: {} | ", run.total_tests),
                    Style::default().fg(Color::White),
                ),
                Span::styled(
                    format!("Passed: {} | ", run.passed),
                    Style::default().fg(Color::Green),
                ),
                Span::styled(
                    format!("Failed: {} | ", run.failed),
                    Style::default().fg(Color::Red),
                ),
                Span::styled(
                    format!("Flaky: {} | ", run.flaky),
                    Style::default().fg(Color::Yellow),
                ),
                Span::styled(
                    format!("Duration: {}ms", run.duration),
                    Style::default().fg(Color::Gray),
                ),
            ]),
        ]);

        frame.render_widget(summary, chunks[0]);
        frame.render_widget(table, chunks[1]);
    }

    fn draw_metrics_tab(frame: &mut Frame, area: Rect, state: &DashboardState) {
        let metric_rows: Vec<Vec<Span>> = state
            .provider_metrics
            .iter()
            .map(|metric| {
                vec![
                    Span::raw(metric.name.clone()),
                    Span::raw(" "),
                    Span::styled(
                        format!("{} runs", metric.total_runs),
                        Style::default().fg(Color::White),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        format!("/{}/", metric.successful_runs),
                        Style::default().fg(Color::Green),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        format!("{}%", metric.success_rate),
                        Style::default().fg(if metric.success_rate >= 90.0 { Color::Green } else if metric.success_rate >= 70.0 { Color::Yellow } else { Color::Red }),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        format!("{}ms avg", metric.average_duration.round()),
                        Style::default().fg(Color::Gray),
                    ),
                ]
            })
            .collect();

        let table = Table::new(metric_rows)
            .header(
                vec![Line::from(vec![
                    Span::styled("Provider", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Total Runs", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Successful", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Success Rate", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Avg Duration", Style::default().fg(Color::Cyan)),
                ])]
            )
            .block(
                Block::default()
                    .title(" Provider Metrics ")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded),
            )
            .widths(&[
                Constraint::Percentage(20),
                Constraint::Percentage(25),
                Constraint::Percentage(15),
                Constraint::Percentage(20),
                Constraint::Percentage(20),
            ]);

        frame.render_widget(table, area);
    }

    fn draw_coverage_tab(frame: &mut Frame, area: Rect, state: &DashboardState) {
        if state.coverage_data.is_empty() {
            let paragraph = Paragraph::new("No coverage data available")
                .alignment(Alignment::Center)
                .block(
                    Block::default()
                        .title(" Coverage ")
                        .borders(Borders::ALL)
                        .border_type(BorderType::Rounded),
                );
            frame.render_widget(paragraph, area);
            return;
        }

        let coverage_data: Vec<(String, u64)> = state
            .coverage_data
            .iter()
            .map(|d| (d.test_file.clone(), d.coverage_percentage as u64))
            .collect();

        let sparkline = Sparkline::default()
            .block(
                Block::default()
                    .title(" Coverage Heat Map ")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded),
            )
            .data(&coverage_data.iter().map(|(_, p)| *p).collect::<Vec<_>>())
            .style(Style::default().fg(Color::Yellow))
            .max(100);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .margin(1)
            .constraints(
                [
                    Constraint::Length(10),
                    Constraint::Min(0),
                ]
                .as_ref(),
            )
            .split(area);

        frame.render_widget(sparkline, chunks[0]);

        let coverage_rows: Vec<Vec<Span>> = state
            .coverage_data
            .iter()
            .map(|cov| {
                let color = if cov.coverage_percentage >= 90.0 {
                    Color::Green
                } else if cov.coverage_percentage >= 70.0 {
                    Color::Yellow
                } else {
                    Color::Red
                };

                vec![
                    Span::raw(cov.test_file.clone()),
                    Span::raw(" "),
                    Span::styled(
                        format!("{}/{}", cov.covered_lines, cov.total_lines),
                        Style::default().fg(Color::White),
                    ),
                    Span::raw(" "),
                    Span::styled(
                        format!("{}%", cov.coverage_percentage),
                        Style::default().fg(color),
                    ),
                ]
            })
            .collect();

        let table = Table::new(coverage_rows)
            .header(
                vec![Line::from(vec![
                    Span::styled("File", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Lines", Style::default().fg(Color::Cyan)),
                    Span::raw(" "),
                    Span::styled("Coverage", Style::default().fg(Color::Cyan)),
                ])]
            )
            .widths(&[
                Constraint::Percentage(60),
                Constraint::Percentage(20),
                Constraint::Percentage(20),
            ]);

        frame.render_widget(table, chunks[1]);
    }

    fn draw_footer(frame: &mut Frame, area: Rect, state: &DashboardState) {
        let footer_text = vec![
            Span::styled("q", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw(": quit | "),
            Span::styled("Tab", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw(": switch tabs | "),
            Span::styled("↑/↓", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw(": navigate | "),
            Span::styled("r", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw(": refresh | "),
            Span::raw(format!("| Runs: {} | Providers: {}", state.test_runs.len(), state.provider_metrics.len())),
        ];

        let footer = Paragraph::new(Line::from(footer_text))
            .alignment(Alignment::Center)
            .style(Style::default().fg(Color::Gray));

        frame.render_widget(footer, area);
    }
}
