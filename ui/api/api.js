export async function toFetch(startdate,enddate) {
    try {
        const postData = await fetch(`https://www.courtlistener.com/api/rest/v4/search/?type=o&filed_after=${startdate}&filed_before=${enddate}`)
        const posts = await postData.json();
        return posts;
    } catch (error) {
        console.error(error);
    }
}