const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const functions = require("firebase-functions");
// Correct Path: Pointing to the compiled bundle, NOT ./src/app
const mod = require('./dist/server.js');
const app = mod.default || mod;

// Production Export 
// Firebase automatically loads the variables from your .env file into process.env

exports.api = functions.https.onRequest(app);

exports.monthlyBillingCron = onSchedule({
    schedule: '0 0 * * *', // Run daily at midnight to check per-app billing schedules
    timeoutSeconds: 300,
    memory: '1GiB'
}, async (event) => {
    if (mod.billingService) {
        await mod.billingService.runCustomerMonthlyBilling(false);
    } else {
        console.error('billingService is not exported in the server bundle');
    }
});

// exports.aggregateAnalyticsCron = onSchedule({
//     schedule: '* * * * *', // Every minute
//     timeoutSeconds: 60,
//     memory: '256MiB'
// }, async (event) => {
//     if (mod.analyticsService) {
//         await mod.analyticsService.aggregateLogs();
//     } else {
//         console.error('analyticsService is not exported in the server bundle');
//     }
// });