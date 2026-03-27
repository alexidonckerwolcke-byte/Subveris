# Post-Signup Flow Testing Guide

## How to Test the Post-Signup Flow

### Step 1: Sign Up
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter a **new email address** (must not have been used before)
4. Enter a password
5. Click "Sign Up"
6. You should see: "Check your email to confirm your account"

### Step 2: Confirm Email
1. Check your email inbox (or spam folder)
2. Look for email from "Supabase"
3. Click the "Confirm your email" link
4. You should be automatically logged in

### Step 3: Verify Post-Signup Flow Shows
After confirming email, you should see:
- **Modal Title**: "Let's get started!"
- **Step 1**: Plan selection (Free vs Premium)
- **Step 2**: 2FA setup option

### What Should Happen with Each Plan

**Free Plan:**
- Click "Get Started with Free"
- Modal moves to Step 2 (2FA setup)
- You can "Set Up 2FA" or "Skip"

**Premium Plan:**
- Click "Upgrade to Premium"
- You're redirected to /pricing page to complete payment
- After payment, post-signup flow closes

### Step 4: Tutorial Should Display
After choosing your plan and 2FA option:
- The post-signup modal should close
- You should see the **Onboarding Tutorial** with:
  - "Welcome to Subveris!"
  - Tips about subscriptions, savings, etc.
  - "Next" and "Skip Tutorial" buttons

## If Something Doesn't Show

### Post-signup modal doesn't appear:
1. Check browser console (F12) for errors
2. Check React DevTools and search for "PostSignupFlow" component
3. Verify `justSignedUp` flag is being set in auth-context
4. Check localStorage for 'justSignedUp' flag

### Tutorial doesn't appear:
1. Check if OnboardingTutorial component is rendering
2. Verify tutorial completion flag isn't set
3. Look for z-index issues blocking the component

## Current Implementation Details

- **Detection**: New user signup detected via account age < 7 days AND no existing subscriptions
- **Storage**: `justSignedUp` flag stored in localStorage and React state
- **Trigger**: Post-signup flow opens when `justSignedUp && user` in App.tsx useEffect
- **Plan Selection**: Stored in localStorage as 'postSignupPlan'
- **2FA Setup**: Stored in localStorage as 'postSignupSetup2FA'
