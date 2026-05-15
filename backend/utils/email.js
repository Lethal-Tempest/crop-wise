import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

export const sendAuctionEndEmails = async (farmer, topBidders, crop) => {
  try {
    let farmerHtml = `<h3>Your auction for ${crop.cropName} has ended!</h3><p>Here are your top buyers to negotiate with:</p><ul>`;
    topBidders.forEach((bid, i) => {
      farmerHtml += `<li><b>#${i+1} ${bid.bidderName}</b>: ₹${bid.amount} <br> Email: ${bid.bidderId.email} | Phone: ${bid.bidderId.phone || 'N/A'}</li>`;
    });
    farmerHtml += `</ul>`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: farmer.email,
      subject: `Auction Ended: ${crop.cropName}`,
      html: farmerHtml
    });

    for (const bid of topBidders) {
      const buyerHtml = `
        <h3>You were a top bidder for ${crop.cropName}!</h3>
        <p>Your Bid: ₹${bid.amount}</p>
        <p>Contact the farmer to finalize the deal:</p>
        <ul>
          <li>Farmer: ${farmer.name}</li>
          <li>Email: ${farmer.email}</li>
          <li>Phone: ${farmer.phone || 'N/A'}</li>
        </ul>
      `;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: bid.bidderId.email,
        subject: `Auction Results: ${crop.cropName}`,
        html: buyerHtml
      });
    }
    console.log("✅ Auction closure emails sent successfully.");
  } catch (err) {
    console.error("❌ Email failed to send:", err);
  }
};