import { initializeBrief, readBudget } from './brief.js';
import { initializeCatalog } from './catalog.js';
import { addReference, initializeShortlist, refreshShortlist } from './shortlist.js';

initializeBrief(refreshShortlist);
initializeShortlist(readBudget);
initializeCatalog(readBudget, addReference);
