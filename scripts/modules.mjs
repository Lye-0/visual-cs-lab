// One authoritative order for the offline build, inventory, and model tests.
export const curriculumModules=[
 'curriculum-math','curriculum-statistics','curriculum-theory',
 'curriculum-information','curriculum-programming','curriculum-algorithms',
 'curriculum-compilers','curriculum-circuits','curriculum-architecture',
 'curriculum-systems','curriculum-distributed','curriculum-databases',
 'curriculum-network','curriculum-network-advanced'
];
export const modelModules=['core','network','foundations','security','git','missions','catalog','extensions','learning','pedagogy','notes-models','lesson-enhancements','lessons-core','lessons-network','lessons-security','lessons-missions','lesson-registry','lesson-checks','curriculum-kit','curriculum-tools','curriculum-runtime',...curriculumModules];
export const visualModules=['player','visuals','notes-visuals','curriculum-visuals'];
export const browserModules=[...modelModules,...visualModules,'app','pages','workbench','reader','boot'];
export const styles=['style','reader-svg-theme','reader','notes-visuals','reader-library','reader-responsive','curriculum'];
