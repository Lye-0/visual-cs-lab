// One authoritative order for the offline build, inventory, and model tests.
export const modelModules=['core','network','foundations','security','git','missions','catalog','extensions','learning','pedagogy','notes-models','lesson-enhancements','lessons-core','lessons-network','lessons-security','lessons-missions','lesson-registry','lesson-checks'];
export const visualModules=['player','visuals','notes-visuals'];
export const browserModules=[...modelModules,...visualModules,'app','pages','workbench','reader','boot'];
export const styles=['style','reader','notes-visuals','reader-library','reader-responsive'];
