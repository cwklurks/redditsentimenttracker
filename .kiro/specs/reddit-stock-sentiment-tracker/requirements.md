# Requirements Document

## Introduction

The Reddit Stock Sentiment Tracker is a Streamlit web application that monitors stock discussions on r/wallstreetbets, performs sentiment analysis on the most frequently mentioned stocks, and displays the results in an intuitive dashboard. The application will help users understand market sentiment trends by analyzing social media discussions about stocks.

## Requirements

### Requirement 1

**User Story:** As a retail investor, I want to see which stocks are being discussed most frequently on r/wallstreetbets, so that I can identify trending stocks in the community.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display the top 10 most mentioned stocks from r/wallstreetbets
2. WHEN stock mentions are counted THEN the system SHALL aggregate mentions from the last 24 hours of posts
3. WHEN displaying stock mentions THEN the system SHALL show the stock ticker symbol and mention count
4. IF a stock ticker is mentioned multiple times in a single post THEN the system SHALL count it only once per post

### Requirement 2

**User Story:** As a user, I want to see sentiment analysis for the top mentioned stocks, so that I can understand whether the community sentiment is positive, negative, or neutral.

#### Acceptance Criteria

1. WHEN sentiment analysis is performed THEN the system SHALL analyze comments and posts mentioning each stock
2. WHEN sentiment is calculated THEN the system SHALL provide a sentiment score between -1 (negative) and 1 (positive)
3. WHEN displaying sentiment THEN the system SHALL categorize sentiment as Positive, Negative, or Neutral
4. WHEN sentiment analysis fails for a stock THEN the system SHALL display "N/A" for that stock's sentiment

### Requirement 3

**User Story:** As a user, I want to view the sentiment data in a clean web interface, so that I can easily interpret the information.

#### Acceptance Criteria

1. WHEN the web app loads THEN the system SHALL display a dashboard with stock sentiment data
2. WHEN displaying results THEN the system SHALL show stock ticker, mention count, and sentiment in a table format
3. WHEN sentiment is positive THEN the system SHALL display it with green color coding
4. WHEN sentiment is negative THEN the system SHALL display it with red color coding
5. WHEN sentiment is neutral THEN the system SHALL display it with gray color coding
6. WHEN the page loads THEN the system SHALL include a refresh button to update data

### Requirement 4

**User Story:** As a user, I want the data to be automatically refreshed, so that I can see current market sentiment without manual intervention.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL automatically fetch and analyze the latest data
2. WHEN the refresh button is clicked THEN the system SHALL update all sentiment data
3. WHEN data is being refreshed THEN the system SHALL display a loading indicator
4. IF data fetching fails THEN the system SHALL display an error message and retain previous data if available

### Requirement 5

**User Story:** As a user, I want the application to handle errors gracefully, so that I can still use the app even when some data is unavailable.

#### Acceptance Criteria

1. WHEN Reddit API is unavailable THEN the system SHALL display an appropriate error message
2. WHEN sentiment analysis fails THEN the system SHALL continue to display mention counts
3. WHEN no stocks are found THEN the system SHALL display a message indicating no data available
4. WHEN rate limits are exceeded THEN the system SHALL display a message about temporary unavailability

### Requirement 6

**User Story:** As a developer, I want the application to be deployable to Streamlit Cloud, so that it can be easily shared and accessed online.

#### Acceptance Criteria

1. WHEN the application is deployed THEN it SHALL run successfully on Streamlit Cloud
2. WHEN deployed THEN the system SHALL handle environment variables for API keys securely
3. WHEN running in production THEN the system SHALL have appropriate error handling for deployment environment
4. WHEN accessing the deployed app THEN users SHALL be able to use all features without local setup