# Introduction

{% hint style="info" %}
You can download the API Reference (OpenAPI specification), which contains the full list of endpoints, parameters and authentication [here](https://image-api.photoroom.com/openapi).
{% endhint %}

Here's a walkthrough of the latest API features:

{% embed url="<https://www.youtube.com/watch?v=sXI6GzTHHOI>" %}

## How does the API work?

The Photoroom API enables you to easily create high-quality images.

It allows you to separate a subject from its background, [re-light](https://docs.photoroom.com/image-editing-api-plus-plan/ai-relight) this subject, add a [realistic shadow](https://docs.photoroom.com/image-editing-api-plus-plan/ai-shadows), generate a [new background](https://docs.photoroom.com/image-editing-api-plus-plan/ai-backgrounds), [resize](https://docs.photoroom.com/image-editing-api-plus-plan/positioning) to given requirements, and more.

Our models are specialized in photo editing using AI.

The API was designed with the goal of being extremely easy to use and integrate.

All endpoints follow the same logic: they take an image as their input, apply edits to it, and return their result as a new edited image.

## Which API should I use?

The Photoroom API consists of two API endpoints, which are available in [two different plans](https://www.photoroom.com/api/pricing).

If you want to **apply edits** to your image, such as resizing, replacing the background, re-lighting the subject or adding a realistic shadow, then you'll want to call the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan):

{% content-ref url="../image-editing-api-plus-plan" %}
[image-editing-api-plus-plan](https://docs.photoroom.com/image-editing-api-plus-plan)
{% endcontent-ref %}

However, if you **only need to remove the background** from an image and don't need to perform any additional edits, then you'll want to call the [Remove Background API](https://docs.photoroom.com/remove-background-api-basic-plan):

{% content-ref url="../remove-background-api-basic-plan" %}
[remove-background-api-basic-plan](https://docs.photoroom.com/remove-background-api-basic-plan)
{% endcontent-ref %}

{% hint style="warning" %}
Please keep in mind that 1 call to the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan) is worth 5 calls to the [Remove Background API](https://docs.photoroom.com/remove-background-api-basic-plan).

More details about how API calls are billed is [available here](https://docs.photoroom.com/getting-started/pricing).
{% endhint %}

## Which AI features are available in the API?

The Photoroom API enables you to create great looking images through a collection of state-of-the-art AI features.

Here's a list of all the AI features that are available in the Photoroom API:

* AI Background Removal (available in both the [Remove Background API](https://docs.photoroom.com/remove-background-api-basic-plan) and the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Shadows](https://docs.photoroom.com/image-editing-api-plus-plan/ai-shadows) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Backgrounds](https://docs.photoroom.com/image-editing-api-plus-plan/ai-backgrounds) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Relighting](https://docs.photoroom.com/image-editing-api-plus-plan/ai-relight) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Text Removal](https://docs.photoroom.com/image-editing-api-plus-plan/ai-text-removal) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Expand](https://docs.photoroom.com/image-editing-api-plus-plan/ai-expand) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Beautifier](https://docs.photoroom.com/image-editing-api-plus-plan/ai-beautifier) (abailable in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Uncrop](https://docs.photoroom.com/image-editing-api-plus-plan/ai-uncrop) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [AI Upscale](https://docs.photoroom.com/image-editing-api-plus-plan/alpha-ai-upscale) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [Create Any Image](https://docs.photoroom.com/image-editing-api-plus-plan/create-any-image) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))
* [Describe Any Change](https://docs.photoroom.com/image-editing-api-plus-plan/edit-with-ai) (available in the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan))

## Will the API make alterations to my products?

No, for most use cases the API will not make alterations to your products.

By default, the API will:

1. remove the background of the original image, to isolate its main subject
2. reposition and add effects around that main subject

With this approach, it's simply not possible to introduce alterations, such as modifying a logo or a brand name.

The API does offer some features that can, however, introduce alterations.

Here's their exhaustive list:

* [AI Relight](https://docs.photoroom.com/image-editing-api-plus-plan/ai-relight) and [Green Screen Despill](https://docs.photoroom.com/remove-background-api-basic-plan/green-screen-despill), which can alter colors
* [AI Text Removal](https://docs.photoroom.com/image-editing-api-plus-plan/ai-text-removal), which removes text from the main subject
* [AI Uncrop](https://docs.photoroom.com/image-editing-api-plus-plan/ai-uncrop) and [AI Expand](https://docs.photoroom.com/image-editing-api-plus-plan/ai-expand), which generates the missing part of the original image
* [AI Beautifier](https://docs.photoroom.com/image-editing-api-plus-plan/ai-beautifier), which creates a re-imagined version of the main subject
* [AI Upscale](https://docs.photoroom.com/image-editing-api-plus-plan/alpha-ai-upscale), which increases the resolution of the original image
* [Describe Any Change](https://docs.photoroom.com/image-editing-api-plus-plan/edit-with-ai), which edits the original image using an AI model

If you use one of these features and product accuracy is important for you, then we recommend that you have a human validation of the images produced by the API.

## How can I get my API key?

In order to use the Photoroom API, you'll first need to activate the API for your account and obtain your unique API key. Here's how to do it:

1. **Activate the API for your account**: This can be done by [visiting your account settings](https://app.photoroom.com/api-dashboard) on the Photoroom website. Make sure that you're logged into your account.

{% hint style="info" %}
We recommend that you use a generic email address (e.g. *<admin@mycompany.com>*) to create the Photoroom account that will own your API key.

Not using a personal email address (e.g. <firstname.lastname@mycompany.com>) allows you to retain ownership over your details and API key(s) even if members of your team leave your organization.
{% endhint %}

2. **Copy your API key**: Once you've activated the API for your account, you'll be provided with a unique API key. This key is essentially your password to make API calls, so it's important to keep it safe and secure. You can retrieve your API key by following the [same link used for the activation](https://app.photoroom.com/api-dashboard).

{% hint style="danger" %}
Keep in mind that your API key is tied to your account and should be kept secret. It should not be shared publicly or with others.

If you believe your API key has been compromised, you can revoke it yourself on the [API dashboard](https://app.photoroom.com/api-dashboard) and create a new one. If you need more help or believe your key has been used maliciously, you can [contact our support](https://docs.photoroom.com/getting-started/support) for assistance​.
{% endhint %}

3. **Use your API key**: The key must be passed in the `x-api-key` HTTP header on every request.

If you have multiple teams or applications, you can create **multiple API keys** [in your account settings](https://app.photoroom.com/api-dashboard) and use one key per use case. For example, you can have separate keys for your development and production environments, or create keys for individual services.

## How do I make my first API call?

Once you've [created your API key](#how-can-i-get-my-api-key), you're all set to make your first API call!

From there, there are two ways to start using the API:

1. If you already know which feature you're looking for, then you can simply use the *Try it now!* button that's available on the documentation page of that feature:

<figure><img src="https://2855892273-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1SYxn7dWbQYsNtUdJE3f%2Fuploads%2Fgytr7HoNOuJDVODwQhJQ%2FScreenshot%202026-03-16%20at%2016.37.57.png?alt=media&#x26;token=d2dc92e4-3a2b-4227-85d5-a580b5de01e7" alt=""><figcaption></figcaption></figure>

2. If not, then you can use the search bar at the top of the documentation and simply describe the output that you want to achieve:

<figure><img src="https://2855892273-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1SYxn7dWbQYsNtUdJE3f%2Fuploads%2Fv3KYvLjSgYsDZPHuvJKc%2FMy%20video.gif?alt=media&#x26;token=cd25e5f2-7957-40eb-9452-68dc91c70c6b" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Please note that you can make API calls for free using our [Sandbox mode](https://docs.photoroom.com/pricing#can-i-get-free-api-calls).
{% endhint %}

## How do I integrate the API into my project?

The Photoroom API uses standard HTTP calls, which makes it easy to integrate with any programming language or networking framework.

For the [Remove Background API](https://docs.photoroom.com/remove-background-api-basic-plan), we provide API wrappers for [JavaScript](https://docs.photoroom.com/remove-background-api-basic-plan/code-samples/web-integration), [Python](https://docs.photoroom.com/remove-background-api-basic-plan/code-samples/python-integration), [Node.js](https://docs.photoroom.com/remove-background-api-basic-plan/code-samples/node.js-integration), and [iOS](https://docs.photoroom.com/remove-background-api-basic-plan/code-samples/ios-swift-integration).

For the [Remove Background API](https://docs.photoroom.com/remove-background-api-basic-plan) and the [Image Editing API](https://docs.photoroom.com/image-editing-api-plus-plan), we also provide integration tutorials that explain how to process images from:

* [Local File System](https://docs.photoroom.com/integrations/how-to-process-images-from-a-local-directory)
* [Google Drive](https://docs.photoroom.com/integrations/how-to-process-images-from-google-drive) & [Google Sheets](https://docs.photoroom.com/integrations/how-to-process-images-from-google-sheets)
* [Excel spreadsheets](https://docs.photoroom.com/integrations/how-to-process-images-from-an-excel-spreadsheet)
* [Zapier](https://docs.photoroom.com/integrations/how-to-process-images-from-google-drive-using-zapier) & [Make.com](https://docs.photoroom.com/integrations/how-to-process-images-from-google-drive-using-make.com)
* [iOS & macOS Shortcuts](https://docs.photoroom.com/integrations/how-to-process-images-using-an-ios-or-macos-shortcut)

## Recommended workflows by use case

Before diving deeper into the details of the Photoroom API, we recommend reading the tutorials that best match your use cases.&#x20;

Each tutorial contains tested parameter combinations that produce high-quality results:

* [How to improve images for second-hand item marketplaces](https://docs.photoroom.com/tutorials/how-to-improve-images-for-second-hand-item-marketplaces)
* [How to create e-commerce images with consistent brand guidelines](https://docs.photoroom.com/tutorials/how-to-create-e-commerce-images-with-consistent-brand-guidelines)
* [How to create food delivery images with consistent brand guidelines](https://docs.photoroom.com/tutorials/how-to-create-food-delivery-images-with-consistent-brand-guidelines)
* [How to create compliant product images for Google Shopping](https://docs.photoroom.com/tutorials/how-to-create-compliant-product-images-for-google-shopping)
* [How to create sticker images](https://docs.photoroom.com/tutorials/how-to-create-sticker-images)
* [How to create a selfie generator](https://docs.photoroom.com/tutorials/how-to-create-a-selfie-generator)



1688找货源


❯



