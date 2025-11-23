// Content script to inject Sponsor button on GitHub issue pages

(function() {
  'use strict';

  console.log('GitHub Bounty: Content script loaded');

  // Function to find the Edit button and add Sponsor button next to it
  function addSponsorButton() {
    // Check if Sponsor button already exists
    if (document.getElementById('github-bounty-sponsor-btn')) {
      return;
    }

    let editButton = null;
    let targetContainer = null;
    
    // Strategy 1: Look for GitHub's issue header actions area
    const headerActions = document.querySelector('.gh-header-actions') || 
                         document.querySelector('[data-testid="issue-header-actions"]') ||
                         document.querySelector('.d-flex.flex-items-start');
    
    if (headerActions) {
      console.log('GitHub Bounty: Found header actions container');
      // Look for Edit button in the header actions
      const buttons = headerActions.querySelectorAll('button, a[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const title = btn.getAttribute('title') || '';
        
        if (text === 'Edit' || ariaLabel.toLowerCase().includes('edit') || title.toLowerCase().includes('edit')) {
          editButton = btn;
          targetContainer = headerActions;
          console.log('GitHub Bounty: Found Edit button in header actions');
          break;
        }
      }
    }

    // Strategy 2: Search all buttons on the page for Edit button near issue header
    if (!editButton) {
      console.log('GitHub Bounty: Trying broader search for Edit button');
      const issueHeader = document.querySelector('.gh-header') || 
                         document.querySelector('[data-testid="issue-title"]')?.closest('div') ||
                         document.querySelector('.d-flex.flex-column.flex-md-row.gap-3');
      
      if (issueHeader) {
        const allButtons = issueHeader.querySelectorAll('button, a[role="button"], a.btn');
        for (const btn of allButtons) {
          const text = btn.textContent?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          
          if (text === 'Edit' || ariaLabel.toLowerCase().includes('edit')) {
            editButton = btn;
            targetContainer = btn.parentElement;
            console.log('GitHub Bounty: Found Edit button near issue header');
            break;
          }
        }
      }
    }

    // Strategy 3: Look for any button with "Edit" text in the visible header area
    if (!editButton) {
      const allPageButtons = document.querySelectorAll('button, a[role="button"]');
      for (const btn of allPageButtons) {
        const text = btn.textContent?.trim();
        if (text === 'Edit') {
          // Check if it's in the top portion of the page (likely the header)
          const rect = btn.getBoundingClientRect();
          if (rect.top < 500 && rect.top > 0) { // Within first 500px from top
            const parent = btn.closest('.gh-header, .d-flex, [class*="header"]');
            if (parent) {
              editButton = btn;
              targetContainer = btn.parentElement;
              console.log('GitHub Bounty: Found Edit button by position');
              break;
            }
          }
        }
      }
    }

    if (!editButton) {
      console.warn('GitHub Bounty: Edit button not found. Current URL:', window.location.href);
      console.warn('GitHub Bounty: Available buttons:', Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        ariaLabel: b.getAttribute('aria-label'),
        classes: b.className
      })));
      return;
    }

    // Create Sponsor button
    const sponsorButton = document.createElement('button');
    sponsorButton.id = 'github-bounty-sponsor-btn';
    sponsorButton.className = editButton.className || 'btn';
    sponsorButton.textContent = 'Sponsor';
    sponsorButton.setAttribute('type', 'button');
    sponsorButton.style.marginLeft = '8px';
    sponsorButton.style.marginRight = '8px';
    
    // Copy any relevant attributes from Edit button
    if (editButton.hasAttribute('data-view-component')) {
      sponsorButton.setAttribute('data-view-component', 'true');
    }
    
    // Add click handler
    sponsorButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleSponsorClick();
    });

    // Insert the button after the Edit button
    if (editButton.nextSibling) {
      editButton.parentNode.insertBefore(sponsorButton, editButton.nextSibling);
    } else {
      editButton.parentNode.appendChild(sponsorButton);
    }
    
    console.log('GitHub Bounty: Sponsor button added successfully!');
  }

  // Handle Sponsor button click
  function handleSponsorClick() {
    // Extract issue information from the page
    const issueUrl = window.location.href;
    const issueMatch = issueUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    
    if (issueMatch) {
      const [, owner, repo, issueNumber] = issueMatch;
      const issueData = {
        owner,
        repo,
        issueNumber,
        url: issueUrl
      };

      console.log('GitHub Bounty: Sponsor clicked for issue', issueData);
      
       chrome.runtime.sendMessage(
      { type: 'OPEN_SPONSOR_FLOW', issue: issueData },
      (response) => {
        console.log('Contributors response', response);
      }
    );
    }
  }

  // Wait for page to load and observe changes (GitHub uses dynamic content)
  function init() {
    console.log('GitHub Bounty: Initializing...');
    
    // Try immediately
    addSponsorButton();

    // Also observe DOM changes (GitHub loads content dynamically)
    const observer = new MutationObserver(function(mutations) {
      if (!document.getElementById('github-bounty-sponsor-btn')) {
        addSponsorButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Try multiple times with delays to catch late-loading content
    setTimeout(addSponsorButton, 500);
    setTimeout(addSponsorButton, 1000);
    setTimeout(addSponsorButton, 2000);
    setTimeout(addSponsorButton, 3000);
    setTimeout(addSponsorButton, 5000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // If already loaded, wait a bit for GitHub's JS to finish
    setTimeout(init, 100);
  }

  // Also listen for navigation events (GitHub uses SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('GitHub Bounty: Page navigated, re-initializing');
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });
})();

