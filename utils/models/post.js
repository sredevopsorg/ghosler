import Stats from './stats.js';
import BitSet from '../bitset.js';
import Files from '../data/files.js';
import Miscellaneous from '../misc.js';
import {logDebug, logTags} from '../log/logger.js';

/**
 * Represents a Post.
 */
export default class Post {
    /**
     * Creates an instance of Post.
     *
     * @param {string} [id=''] - The unique identifier for the Post.
     * @param {string} [url=''] - The URL of the Post.
     * @param {string} [date=''] - The date of the Post.
     * @param {string} [title=''] - The title of the Post.
     * @param {string} [content=''] - The content of the Post in HTML format.
     * @param {string} [excerpt=''] - The short excerpt of the Post.
     * @param {string} [featureImage=''] - The URL of the feature image of the Post.
     * @param {string} [featureImageCaption=''] - The caption of the feature image.
     * @param {string} [primaryAuthor=''] - The primary author of the Post.
     * @param {string} [authors=''] - The authors of the Post.
     * @param {Stats}  [stats=new Stats()] - The statistics related to this Post.
     */
    constructor(
        id = '',
        url = '',
        date = '',
        title = '',
        content = '',
        excerpt = '',
        featureImage = '',
        featureImageCaption = '',
        primaryAuthor = '',
        authors = '',
        stats = new Stats()
    ) {
        this.id = id;
        this.url = url;
        this.date = date;
        this.title = title;
        this.content = content;
        this.excerpt = excerpt;
        this.featureImage = featureImage;
        this.featureImageCaption = featureImageCaption;
        this.primaryAuthor = primaryAuthor;
        this.authors = authors;
        this.stats = stats;
    }

    /**
     * Make a Post object from the received payload.
     *
     * @param {Object} payload - The payload to create a Post from.
     * @returns {Post} The newly created Post object.
     */
    static make(payload) {
        const post = payload.post.current;

        return new Post(
            post.id,
            post.url,
            Miscellaneous.formatDate(post.published_at),
            post.title,
            post.html,
            post.custom_excerpt ?? post.excerpt ?? post.plaintext.substring(0, 75),
            post.feature_image,
            post.feature_image_caption,
            post.primary_author.name,
            post.authors.filter(author => author.id !== post.primary_author.id).map(author => author.name).join(', '),
            new Stats()
        );
    }

    static async updateStats(encryptedUUID) {
        const uuid = Miscellaneous.decode(encryptedUUID);

        const [postId, memberIndex] = uuid.split('_');
        const post = await Files.get(postId);
        if (!post) return;

        const emailOpenedStats = post.stats.emailsOpened;
        const bitSet = new BitSet(emailOpenedStats);

        if (bitSet.get(parseInt(memberIndex)) === 0) {
            bitSet.set(parseInt(memberIndex), 1);
            post.stats.emailsOpened = bitSet.toString();

            const saved = await Files.create(post, true);
            if (saved) {
                logDebug(logTags.Stats, `Tracking updated for post: ${post.title}`);
            }
        }
    }

    /**
     * Save the data when first received from the webhook.
     *
     * @returns {Promise<boolean>} A promise that resolves to true if file creation succeeded, false otherwise.
     */
    async save() {
        return await Files.create(this.#saveable());
    }

    /**
     * Saves the updated data.
     *
     * @returns {Promise<boolean>} A promise that resolves to true if file creation succeeded, false otherwise.
     */
    async update() {
        return await Files.create(this.#saveable(), true);
    }

    /**
     * Returns only the fields that need to be saved.
     *
     * @returns {Object} Fields that need to be saved.
     */
    #saveable() {
        return {
            id: this.id,
            url: this.url,
            date: this.date,
            title: this.title,
            author: this.primaryAuthor,
            stats: this.stats
        };
    }
}

