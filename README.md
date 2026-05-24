# EmailSecurity: Multiclass Email Security Web App

EmailSecurity is a web application for classifying email messages into four categories: **ham**, **spam**, **phishing**, and **promotion**.

The project combines text processing, trained classification models, a Flask backend, and a responsive web interface to support email security analysis.

## Live Demo

The deployed version is available on Hugging Face Spaces:

https://huggingface.co/spaces/Petrolino/EmailSecurity

## Project Overview

Email is one of the most common channels used for unwanted communication, fraud attempts, phishing attacks, promotional messages, and bulk advertising.

EmailSecurity allows a user to enter an email subject and body, then returns:

- the predicted email category;
- the confidence score;
- the class probability distribution;
- a basic risk level;
- a practical security recommendation.

The project was developed as a cybersecurity and machine learning portfolio project, with a focus on practical email classification and model deployment.

## Classification Categories


--> Ham: Legitimate email communication 
--> Spam: Unwanted or unsolicited bulk email 
--> Phishing: Potentially harmful email attempting to mislead the user or steal sensitive information 
--> Promotion: Marketing, discount, offer, or advertising-related email 

## Main Features

- Email subject and body analysis
- Four-class email classification
- Prediction confidence score
- Class probability display
- Basic risk recommendation
- Clean cybersecurity-style web interface
- Flask backend for local use
- Live deployment on Hugging Face Spaces
- Synthetic and selected test-style examples for demonstration

